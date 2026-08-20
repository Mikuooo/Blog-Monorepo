import { createHash, randomBytes } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'

import { hashPassword, verifyPassword } from '@blog/shared/password'

import {
  AUTH_REPOSITORY,
  type AuthenticatedSession,
  type AuthenticatedUser,
  type AuthRepository,
  type SessionSummary,
} from './auth.contract.js'
import { AuthError } from './auth.errors.js'

const DUMMY_PASSWORD_HASH =
  'scrypt$131072$8$1$YXV0aC1kdW1teS1zYWx0MQ$zEs3CSZn2lImvKe89O71nTgbEfgccQQZ_89uRZRXijA'

export type LoginInput = {
  identifier: string
  ip?: string
  password: string
  userAgent?: string
}

export type LoginResult = {
  expiresAt: Date
  sessionToken: string
  user: AuthenticatedUser
}

@Injectable()
export class AuthService {
  constructor(@Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository) {}

  async login(input: LoginInput, now = new Date()): Promise<LoginResult> {
    const user = await this.repository.findUserForLogin(input.identifier.trim())
    const passwordMatches = await verifyPassword(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    )
    if (!user || !passwordMatches || user.status !== 'ACTIVE') {
      throw new AuthError('INVALID_CREDENTIALS')
    }

    const sessionToken = randomBytes(32).toString('base64url')
    const expiresAt = new Date(now.getTime() + sessionTtlSeconds() * 1_000)
    await this.repository.createSession({
      expiresAt,
      tokenHash: hashSessionToken(sessionToken),
      userId: user.id,
      ...(input.ip ? { ip: input.ip } : {}),
      ...(input.userAgent ? { userAgent: input.userAgent.slice(0, 500) } : {}),
    })

    const authenticatedUser: AuthenticatedUser = {
      displayName: user.displayName,
      email: user.email,
      id: user.id,
      permissions: user.permissions,
      roles: user.roles,
      username: user.username,
    }
    return { expiresAt, sessionToken, user: authenticatedUser }
  }

  async authenticate(
    sessionToken: string | undefined,
    now = new Date(),
  ): Promise<AuthenticatedSession> {
    if (!sessionToken) throw new AuthError('AUTHENTICATION_REQUIRED')
    const session = await this.repository.findSessionByTokenHash(
      hashSessionToken(sessionToken),
      now,
    )
    if (!session) throw new AuthError('AUTHENTICATION_REQUIRED')
    return session
  }

  async logout(sessionId: string, now = new Date()): Promise<void> {
    await this.repository.revokeSession(sessionId, now)
  }
  listSessions(userId: string, now = new Date()): Promise<SessionSummary[]> { return this.repository.listSessions(userId, now) }
  revokeOtherSessions(userId: string, currentSessionId: string, now = new Date()): Promise<void> { return this.repository.revokeOtherSessions(userId, currentSessionId, now) }
  updateProfile(userId: string, displayName: string) { return this.repository.updateProfile(userId, displayName.trim()) }
  async updatePassword(userId: string, currentSessionId: string, currentPassword: string, nextPassword: string, now = new Date()): Promise<void> { const user = await this.repository.findUserForLogin(userId); if (!user || !await verifyPassword(currentPassword, user.passwordHash)) throw new AuthError('INVALID_CREDENTIALS'); await this.repository.updatePassword(userId, await hashPassword(nextPassword), currentSessionId, now) }
}

export function sessionTtlSeconds(): number {
  const raw = process.env.AUTH_SESSION_TTL_SECONDS?.trim() || '604800'
  const ttl = Number(raw)
  if (!Number.isSafeInteger(ttl) || ttl < 300 || ttl > 2_592_000) {
    throw new Error('AUTH_SESSION_TTL_SECONDS must be an integer between 300 and 2592000')
  }
  return ttl
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
