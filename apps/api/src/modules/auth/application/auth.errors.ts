export type AuthErrorCode = 'AUTHENTICATION_REQUIRED' | 'INVALID_CREDENTIALS'

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code)
    this.name = 'AuthError'
  }
}
