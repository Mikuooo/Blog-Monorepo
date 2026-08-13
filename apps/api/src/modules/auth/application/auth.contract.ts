export type AuthenticatedUser = {
  displayName: string
  email: string
  id: string
  permissions: string[]
  roles: string[]
  username: string
}

export type AuthenticatedSession = {
  id: string
  user: AuthenticatedUser
}

export type LoginUserRecord = AuthenticatedUser & {
  passwordHash: string
  status: 'ACTIVE' | 'DISABLED'
}

export type CreateSessionInput = {
  expiresAt: Date
  ip?: string
  tokenHash: string
  userAgent?: string
  userId: string
}

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY')

export interface AuthRepository {
  createSession(input: CreateSessionInput): Promise<{ id: string }>
  findSessionByTokenHash(tokenHash: string, now: Date): Promise<AuthenticatedSession | null>
  findUserForLogin(identifier: string): Promise<LoginUserRecord | null>
  revokeSession(sessionId: string, revokedAt: Date): Promise<void>
}
