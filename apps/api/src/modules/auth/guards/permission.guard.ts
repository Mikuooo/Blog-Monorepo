import { Inject, Injectable } from '@nestjs/common'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { authHttpError } from '../auth-http-error.js'
import type { AuthenticatedRequest } from '../auth-request.js'
import { REQUIRED_PERMISSIONS } from '../decorators/require-permissions.js'

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required?.length) return true

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const granted = new Set(request.auth?.user.permissions ?? [])
    if (!request.auth || required.some((permission) => !granted.has(permission))) {
      throw authHttpError(403, 'PERMISSION_DENIED', 'The required permission was not granted.')
    }
    return true
  }
}
