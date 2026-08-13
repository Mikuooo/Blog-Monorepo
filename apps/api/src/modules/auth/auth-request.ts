import type { AuthenticatedSession } from './application/auth.contract.js'

export type AuthenticatedRequest = {
  auth?: AuthenticatedSession
  headers: {
    cookie?: string
    origin?: string
    'user-agent'?: string
  }
  ip?: string
  method: string
}
