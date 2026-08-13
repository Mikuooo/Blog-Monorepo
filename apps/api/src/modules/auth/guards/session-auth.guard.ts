import { Inject, Injectable } from '@nestjs/common'
import type { CanActivate, ExecutionContext } from '@nestjs/common'

import { readSessionCookie } from '../auth-cookie.js'
import { authHttpError } from '../auth-http-error.js'
import type { AuthenticatedRequest } from '../auth-request.js'
import { AuthService } from '../application/auth.service.js'
import { AuthError } from '../application/auth.errors.js'

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    try {
      request.auth = await this.authService.authenticate(readSessionCookie(request.headers.cookie))
      return true
    } catch (error) {
      if (!(error instanceof AuthError)) throw error
      throw authHttpError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.')
    }
  }
}
