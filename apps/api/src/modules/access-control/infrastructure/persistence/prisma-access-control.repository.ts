import { Inject, Injectable } from '@nestjs/common'

import type { DatabaseClient } from '@blog/database'

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js'
import type {
  AccessControlListQuery,
  AccessControlRepository,
  AdminRoleListItem,
  AdminUserListItem,
  CreateRoleCommand,
  DeleteRoleResult,
  PageResult,
  PermissionSummary,
  UpdateRoleCommand,
  UpdateUserRolesCommand,
  UpdateUserStatusCommand,
  UserListQuery,
} from '../../application/access-control.contract.js'
import { AccessControlError } from '../../application/access-control.errors.js'

type TransactionClient = Parameters<Parameters<DatabaseClient['$transaction']>[0]>[0]

@Injectable()
export class PrismaAccessControlRepository implements AccessControlRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listUsers(query: UserListQuery): Promise<PageResult<AdminUserListItem>> {
    const keyword = query.keyword?.trim()
    const where = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(keyword
        ? {
            OR: [
              { displayName: { contains: keyword, mode: 'insensitive' as const } },
              { email: { contains: keyword, mode: 'insensitive' as const } },
              { username: { contains: keyword, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
    const [items, total] = await Promise.all([
      this.prisma.client.user.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: userSelect,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
      this.prisma.client.user.count({ where }),
    ])
    return pageResult(items.map(mapUser), query, total)
  }

  async listRoles(query: AccessControlListQuery): Promise<PageResult<AdminRoleListItem>> {
    const keyword = query.keyword?.trim()
    const where = keyword
      ? {
          OR: [
            { code: { contains: keyword, mode: 'insensitive' as const } },
            { name: { contains: keyword, mode: 'insensitive' as const } },
          ],
        }
      : {}
    const [items, total] = await Promise.all([
      this.prisma.client.role.findMany({
        orderBy: [{ isSystem: 'desc' }, { code: 'asc' }, { id: 'asc' }],
        select: roleSelect,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
      this.prisma.client.role.count({ where }),
    ])
    return pageResult(items.map(mapRole), query, total)
  }

  async listPermissions(): Promise<PermissionSummary[]> {
    return this.prisma.client.permission.findMany({
      orderBy: { code: 'asc' },
      select: { code: true, description: true, id: true },
    })
  }

  async updateUserStatus(command: UpdateUserStatusCommand): Promise<AdminUserListItem> {
    return this.prisma.client.$transaction(async (transaction) => {
      const user = await requireUser(transaction, command.userId)
      if (command.actorId === command.userId && command.status === 'DISABLED') {
        throw new AccessControlError('USER_SELF_DISABLE')
      }
      if (command.status === 'DISABLED' && hasRole(user, 'SUPER_ADMIN')) {
        await requireAnotherActiveSuperAdmin(transaction, command.userId)
      }
      const updated = await transaction.user.update({
        data: { status: command.status },
        select: userSelect,
        where: { id: command.userId },
      })
      if (command.status === 'DISABLED') {
        await transaction.loginSession.updateMany({
          data: { revokedAt: new Date() },
          where: { revokedAt: null, userId: command.userId },
        })
      }
      await writeAudit(transaction, {
        action: 'user.status.update',
        actorId: command.actorId,
        after: { status: command.status },
        before: { status: user.status },
        resource: 'user',
        resourceId: command.userId,
      })
      return mapUser(updated)
    })
  }

  async updateUserRoles(command: UpdateUserRolesCommand): Promise<AdminUserListItem> {
    return this.prisma.client.$transaction(async (transaction) => {
      const user = await requireUser(transaction, command.userId)
      const roleIds = [...new Set(command.roleIds)]
      await requireRoles(transaction, roleIds)
      const previousRoleIds = user.roles.map(({ role }) => role.id)
      if (hasRole(user, 'SUPER_ADMIN') && !roleIds.includes(superAdminRoleId(user))) {
        await requireAnotherActiveSuperAdmin(transaction, command.userId)
      }
      await transaction.userRole.deleteMany({ where: { userId: command.userId } })
      if (roleIds.length) {
        await transaction.userRole.createMany({
          data: roleIds.map((roleId) => ({ roleId, userId: command.userId })),
        })
      }
      await writeAudit(transaction, {
        action: 'user.roles.update',
        actorId: command.actorId,
        after: { roleIds },
        before: { roleIds: previousRoleIds },
        resource: 'user',
        resourceId: command.userId,
      })
      return mapUser(
        await transaction.user.findUniqueOrThrow({
          select: userSelect,
          where: { id: command.userId },
        }),
      )
    })
  }

  async createRole(command: CreateRoleCommand): Promise<AdminRoleListItem> {
    try {
      return await this.prisma.client.$transaction(async (transaction) => {
        await requirePermissions(transaction, command.permissionIds)
        const role = await transaction.role.create({
          data: {
            code: command.code,
            description: emptyToNull(command.description),
            name: command.name,
            permissions: {
              createMany: {
                data: command.permissionIds.map((permissionId) => ({ permissionId })),
              },
            },
          },
          select: roleSelect,
        })
        await writeAudit(transaction, {
          action: 'role.create',
          actorId: command.actorId,
          after: { code: role.code, permissionIds: command.permissionIds },
          resource: 'role',
          resourceId: role.id,
        })
        return mapRole(role)
      })
    } catch (error) {
      if (error instanceof AccessControlError) throw error
      if (isUniqueViolation(error)) throw new AccessControlError('ROLE_CODE_EXISTS')
      throw error
    }
  }

  async updateRole(command: UpdateRoleCommand): Promise<AdminRoleListItem> {
    return this.prisma.client.$transaction(async (transaction) => {
      const role = await requireRole(transaction, command.roleId)
      if (role.isSystem && command.permissionIds !== undefined) {
        throw new AccessControlError('ROLE_SYSTEM_PERMISSIONS_FORBIDDEN')
      }
      if (command.permissionIds) await requirePermissions(transaction, command.permissionIds)
      await transaction.role.update({
        data: {
          ...(command.description === undefined
            ? {}
            : { description: emptyToNull(command.description) }),
          ...(command.name === undefined ? {} : { name: command.name }),
        },
        where: { id: command.roleId },
      })
      if (command.permissionIds) {
        await transaction.rolePermission.deleteMany({ where: { roleId: command.roleId } })
        if (command.permissionIds.length) {
          await transaction.rolePermission.createMany({
            data: command.permissionIds.map((permissionId) => ({
              permissionId,
              roleId: command.roleId,
            })),
          })
        }
      }
      await writeAudit(transaction, {
        action: 'role.update',
        actorId: command.actorId,
        after: {
          ...(command.description === undefined ? {} : { description: command.description }),
          ...(command.name === undefined ? {} : { name: command.name }),
          ...(command.permissionIds === undefined ? {} : { permissionIds: command.permissionIds }),
        },
        resource: 'role',
        resourceId: command.roleId,
      })
      return mapRole(
        await transaction.role.findUniqueOrThrow({
          select: roleSelect,
          where: { id: command.roleId },
        }),
      )
    })
  }

  async deleteRole(roleId: string, actorId: string): Promise<DeleteRoleResult> {
    return this.prisma.client.$transaction(async (transaction) => {
      const role = await requireRole(transaction, roleId)
      if (role.isSystem) throw new AccessControlError('ROLE_SYSTEM_DELETE_FORBIDDEN')
      if (role._count.users > 0) throw new AccessControlError('ROLE_HAS_USERS')
      await transaction.role.delete({ where: { id: roleId } })
      await writeAudit(transaction, {
        action: 'role.delete',
        actorId,
        before: { code: role.code },
        resource: 'role',
        resourceId: roleId,
      })
      return { id: roleId }
    })
  }
}

const userSelect = {
  createdAt: true,
  displayName: true,
  email: true,
  id: true,
  lastLoginAt: true,
  roles: { select: { role: { select: { code: true, id: true, name: true } } } },
  status: true,
  updatedAt: true,
  username: true,
} as const

const roleSelect = {
  _count: { select: { users: true } },
  code: true,
  createdAt: true,
  description: true,
  id: true,
  isSystem: true,
  name: true,
  permissions: {
    orderBy: { permission: { code: 'asc' as const } },
    select: { permission: { select: { code: true, description: true, id: true } } },
  },
  updatedAt: true,
} as const

type SelectedUser = {
  createdAt: Date
  displayName: string
  email: string
  id: string
  lastLoginAt: Date | null
  roles: Array<{ role: RoleSummaryRow }>
  status: 'ACTIVE' | 'DISABLED'
  updatedAt: Date
  username: string
}
type RoleSummaryRow = { code: string; id: string; name: string }

function mapUser(user: SelectedUser): AdminUserListItem {
  return {
    createdAt: user.createdAt.toISOString(),
    displayName: user.displayName,
    email: user.email,
    id: user.id,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    roles: user.roles.map(({ role }) => role).sort((a, b) => a.code.localeCompare(b.code)),
    status: user.status,
    updatedAt: user.updatedAt.toISOString(),
    username: user.username,
  }
}

function mapRole(role: {
  _count: { users: number }
  code: string
  createdAt: Date
  description: string | null
  id: string
  isSystem: boolean
  name: string
  permissions: Array<{ permission: PermissionSummary }>
  updatedAt: Date
}): AdminRoleListItem {
  return {
    code: role.code,
    createdAt: role.createdAt.toISOString(),
    description: role.description,
    id: role.id,
    isSystem: role.isSystem,
    name: role.name,
    permissions: role.permissions.map(({ permission }) => permission),
    updatedAt: role.updatedAt.toISOString(),
    userCount: role._count.users,
  }
}

function pageResult<T>(items: T[], query: AccessControlListQuery, total: number): PageResult<T> {
  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
  }
}

async function requireUser(transaction: TransactionClient, userId: string) {
  const user = await transaction.user.findFirst({
    select: userSelect,
    where: { deletedAt: null, id: userId },
  })
  if (!user) throw new AccessControlError('USER_NOT_FOUND')
  return user
}

async function requireRoles(transaction: TransactionClient, roleIds: string[]): Promise<void> {
  if (!roleIds.length) return
  const count = await transaction.role.count({ where: { id: { in: roleIds } } })
  if (count !== roleIds.length) throw new AccessControlError('ROLE_NOT_FOUND')
}

async function requireRole(transaction: TransactionClient, roleId: string) {
  const role = await transaction.role.findUnique({
    select: roleSelect,
    where: { id: roleId },
  })
  if (!role) throw new AccessControlError('ROLE_NOT_FOUND')
  return role
}

async function requirePermissions(
  transaction: TransactionClient,
  permissionIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(permissionIds)]
  const count = await transaction.permission.count({ where: { id: { in: uniqueIds } } })
  if (count !== uniqueIds.length) throw new AccessControlError('PERMISSION_NOT_FOUND')
}

function hasRole(user: { roles: Array<{ role: RoleSummaryRow }> }, code: string): boolean {
  return user.roles.some(({ role }) => role.code === code)
}

function superAdminRoleId(user: { roles: Array<{ role: RoleSummaryRow }> }): string {
  const role = user.roles.find(({ role }) => role.code === 'SUPER_ADMIN')?.role
  if (!role) throw new AccessControlError('ROLE_NOT_FOUND')
  return role.id
}

async function requireAnotherActiveSuperAdmin(
  transaction: TransactionClient,
  excludedUserId: string,
): Promise<void> {
  const count = await transaction.user.count({
    where: {
      deletedAt: null,
      id: { not: excludedUserId },
      roles: { some: { role: { code: 'SUPER_ADMIN' } } },
      status: 'ACTIVE',
    },
  })
  if (count === 0) throw new AccessControlError('LAST_SUPER_ADMIN')
}

type AuditValue = string | number | boolean | null | AuditValue[] | { [key: string]: AuditValue }
type AuditObject = { [key: string]: AuditValue }

async function writeAudit(
  transaction: TransactionClient,
  input: {
    action: string
    actorId: string
    after?: AuditObject
    before?: AuditObject
    resource: string
    resourceId: string
  },
): Promise<void> {
  await transaction.auditLog.create({
    data: {
      action: input.action,
      ...(input.after ? { after: input.after } : {}),
      ...(input.before ? { before: input.before } : {}),
      resource: input.resource,
      resourceId: input.resourceId,
      userId: input.actorId,
    },
  })
}

function emptyToNull(value: string | undefined): string | null {
  return value?.trim() || null
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
}
