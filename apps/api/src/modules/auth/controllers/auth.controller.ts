import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common'
import {
  ApiCookieAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger'

import { clearSessionCookie, createSessionCookie } from '../auth-cookie.js'
import { authHttpError } from '../auth-http-error.js'
import type { AuthenticatedRequest } from '../auth-request.js'
import { AuthService } from '../application/auth.service.js'
import { AuthError } from '../application/auth.errors.js'
import {
  AuthErrorResponseDto,
  AuthUserDto,
  LoginRequestDto,
  LoginResponseDto,
} from '../dto/auth.dto.js'
import { SessionAuthGuard } from '../guards/session-auth.guard.js'
import { TrustedOriginGuard } from '../guards/trusted-origin.guard.js'

type HeaderResponse = { setHeader(name: string, value: string): void }

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(TrustedOriginGuard)
  @ApiOperation({ operationId: 'login', summary: 'Create an administration session' })
  @ApiBody({ type: LoginRequestDto })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ type: AuthErrorResponseDto })
  @ApiForbiddenResponse({ type: AuthErrorResponseDto })
  async login(
    @Body() body: LoginRequestDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: HeaderResponse,
  ): Promise<LoginResponseDto> {
    try {
      const result = await this.authService.login({
        identifier: body.identifier,
        password: body.password,
        ...(request.ip ? { ip: request.ip } : {}),
        ...(request.headers['user-agent'] ? { userAgent: request.headers['user-agent'] } : {}),
      })
      response.setHeader('Set-Cookie', createSessionCookie(result.sessionToken))
      return { expiresAt: result.expiresAt.toISOString(), user: result.user }
    } catch (error) {
      if (!(error instanceof AuthError)) throw error
      throw authHttpError(401, 'INVALID_CREDENTIALS', 'The supplied credentials are invalid.')
    }
  }

  @Post('logout')
  @HttpCode(200)
  @ApiCookieAuth('session')
  @UseGuards(TrustedOriginGuard, SessionAuthGuard)
  @ApiOperation({ operationId: 'logout', summary: 'Revoke the current administration session' })
  @ApiOkResponse({
    schema: { example: { success: true }, properties: { success: { type: 'boolean' } } },
  })
  @ApiUnauthorizedResponse({ type: AuthErrorResponseDto })
  @ApiForbiddenResponse({ type: AuthErrorResponseDto })
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: HeaderResponse,
  ): Promise<{ success: true }> {
    if (!request.auth) {
      throw authHttpError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.')
    }
    await this.authService.logout(request.auth.id)
    response.setHeader('Set-Cookie', clearSessionCookie())
    return { success: true }
  }

  @Get('me')
  @ApiCookieAuth('session')
  @UseGuards(SessionAuthGuard)
  @ApiOperation({
    operationId: 'getCurrentUser',
    summary: 'Get the current administration identity',
  })
  @ApiOkResponse({ type: AuthUserDto })
  @ApiUnauthorizedResponse({ type: AuthErrorResponseDto })
  getCurrentUser(@Req() request: AuthenticatedRequest): AuthUserDto {
    if (!request.auth) {
      throw authHttpError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.')
    }
    return request.auth.user
  }
}
