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
export type SessionSummary = { id: string; createdAt: string; expiresAt: string; ip: string | null; lastSeenAt: string | null; userAgent: string | null }

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY')

export interface AuthRepository {
  createSession(input: CreateSessionInput): Promise<{ id: string }>
  findSessionByTokenHash(tokenHash: string, now: Date): Promise<AuthenticatedSession | null>
  findUserForLogin(identifier: string): Promise<LoginUserRecord | null>
  revokeSession(sessionId: string, revokedAt: Date): Promise<void>
  listSessions(userId: string, now: Date): Promise<SessionSummary[]>
  revokeOtherSessions(userId: string, currentSessionId: string, revokedAt: Date): Promise<void>
  updateProfile(userId: string, displayName: string): Promise<AuthenticatedUser>
  updatePassword(userId: string, passwordHash: string, currentSessionId: string, revokedAt: Date): Promise<void>
}
