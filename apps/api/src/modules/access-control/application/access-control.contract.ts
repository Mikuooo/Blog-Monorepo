export type UserStatus = 'ACTIVE' | 'DISABLED'

export type AccessControlListQuery = {
  keyword?: string
  page: number
  pageSize: number
}

export type UserListQuery = AccessControlListQuery & { status?: UserStatus }

export type RoleSummary = { code: string; id: string; name: string }
export type PermissionSummary = { code: string; description: string | null; id: string }

export type AdminUserListItem = {
  createdAt: string
  displayName: string
  email: string
  id: string
  lastLoginAt: string | null
  roles: RoleSummary[]
  status: UserStatus
  updatedAt: string
  username: string
}

export type AdminRoleListItem = {
  code: string
  createdAt: string
  description: string | null
  id: string
  isSystem: boolean
  name: string
  permissions: PermissionSummary[]
  updatedAt: string
  userCount: number
}

export type PageResult<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type UpdateUserStatusCommand = {
  actorId: string
  status: UserStatus
  userId: string
}

export type UpdateUserRolesCommand = {
  actorId: string
  roleIds: string[]
  userId: string
}

export type CreateRoleCommand = {
  actorId: string
  code: string
  description?: string
  name: string
  permissionIds: string[]
}

export type UpdateRoleCommand = {
  actorId: string
  description?: string
  name?: string
  permissionIds?: string[]
  roleId: string
}

export type DeleteRoleResult = { id: string }

export const ACCESS_CONTROL_REPOSITORY = Symbol('ACCESS_CONTROL_REPOSITORY')

export interface AccessControlRepository {
  createRole(command: CreateRoleCommand): Promise<AdminRoleListItem>
  deleteRole(roleId: string, actorId: string): Promise<DeleteRoleResult>
  listPermissions(): Promise<PermissionSummary[]>
  listRoles(query: AccessControlListQuery): Promise<PageResult<AdminRoleListItem>>
  listUsers(query: UserListQuery): Promise<PageResult<AdminUserListItem>>
  updateRole(command: UpdateRoleCommand): Promise<AdminRoleListItem>
  updateUserRoles(command: UpdateUserRolesCommand): Promise<AdminUserListItem>
  updateUserStatus(command: UpdateUserStatusCommand): Promise<AdminUserListItem>
}
