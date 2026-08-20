import { Inject, Injectable } from '@nestjs/common'

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js'
import type {
  AuthenticatedUser,
  AuthRepository,
  CreateSessionInput,
  LoginUserRecord,
} from '../application/auth.contract.js'

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findUserForLogin(identifier: string): Promise<LoginUserRecord | null> {
    const user = await this.prisma.client.user.findFirst({
      select: userSelect,
      where: {
        deletedAt: null,
        OR: [{ email: identifier }, { username: identifier }, { id: identifier }],
      },
    })
    return user ? mapLoginUser(user) : null
  }

  async createSession(input: CreateSessionInput): Promise<{ id: string }> {
    return this.prisma.client.$transaction(async (transaction) => {
      const session = await transaction.loginSession.create({
        data: {
          expiresAt: input.expiresAt,
          tokenHash: input.tokenHash,
          userId: input.userId,
          ...(input.ip ? { ip: input.ip } : {}),
          ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        },
        select: { id: true },
      })
      await transaction.user.update({
        data: { lastLoginAt: new Date() },
        where: { id: input.userId },
      })
      return session
    })
  }

  async findSessionByTokenHash(tokenHash: string, now: Date) {
    const session = await this.prisma.client.loginSession.findFirst({
      select: { id: true, user: { select: userSelect } },
      where: {
        expiresAt: { gt: now },
        revokedAt: null,
        tokenHash,
        user: { deletedAt: null, status: 'ACTIVE' },
      },
    })
    return session ? { id: session.id, user: mapAuthenticatedUser(session.user) } : null
  }

  async revokeSession(sessionId: string, revokedAt: Date): Promise<void> {
    await this.prisma.client.loginSession.updateMany({
      data: { revokedAt },
      where: { id: sessionId, revokedAt: null },
    })
  }
  async listSessions(userId: string, now: Date) { const rows = await this.prisma.client.loginSession.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, createdAt: true, expiresAt: true, ip: true, lastSeenAt: true, userAgent: true }, where: { userId, revokedAt: null, expiresAt: { gt: now } } }); return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString(), lastSeenAt: row.lastSeenAt?.toISOString() ?? null })) }
  async revokeOtherSessions(userId: string, currentSessionId: string, revokedAt: Date): Promise<void> { await this.prisma.client.loginSession.updateMany({ data: { revokedAt }, where: { userId, id: { not: currentSessionId }, revokedAt: null } }) }
  async updateProfile(userId: string, displayName: string) { return mapAuthenticatedUser(await this.prisma.client.user.update({ data: { displayName }, select: userSelect, where: { id: userId } })) }
  async updatePassword(userId: string, passwordHash: string, currentSessionId: string, revokedAt: Date): Promise<void> { await this.prisma.client.$transaction([this.prisma.client.user.update({ data: { passwordHash }, where: { id: userId } }), this.prisma.client.loginSession.updateMany({ data: { revokedAt }, where: { userId, id: { not: currentSessionId }, revokedAt: null } })]) }
}

const userSelect = {
  displayName: true,
  email: true,
  id: true,
  passwordHash: true,
  roles: {
    select: {
      role: {
        select: {
          code: true,
          permissions: { select: { permission: { select: { code: true } } } },
        },
      },
    },
  },
  status: true,
  username: true,
} as const

type SelectedUser = {
  displayName: string
  email: string
  id: string
  passwordHash: string
  roles: Array<{
    role: { code: string; permissions: Array<{ permission: { code: string } }> }
  }>
  status: 'ACTIVE' | 'DISABLED'
  username: string
}

function mapLoginUser(user: NonNullable<SelectedUser>): LoginUserRecord {
  return { ...mapAuthenticatedUser(user), passwordHash: user.passwordHash, status: user.status }
}

function mapAuthenticatedUser(user: NonNullable<SelectedUser>): AuthenticatedUser {
  return {
    displayName: user.displayName,
    email: user.email,
    id: user.id,
    permissions: [
      ...new Set(
        user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.code)),
      ),
    ].sort(),
    roles: user.roles.map(({ role }) => role.code).sort(),
    username: user.username,
  }
}
