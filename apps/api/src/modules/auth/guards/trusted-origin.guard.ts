import { Injectable } from '@nestjs/common'
import type { CanActivate, ExecutionContext } from '@nestjs/common'

import { authHttpError } from '../auth-http-error.js'
import type { AuthenticatedRequest } from '../auth-request.js'

@Injectable()
export class TrustedOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const origin = request.headers.origin
    if (!origin || trustedOrigins().has(origin)) return true
    throw authHttpError(403, 'UNTRUSTED_ORIGIN', 'The request origin is not allowed.')
  }
}

export function trustedOrigins(): ReadonlySet<string> {
  const configured = process.env.ADMIN_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  return new Set(configured?.length ? configured : ['http://localhost:3002'])
}
