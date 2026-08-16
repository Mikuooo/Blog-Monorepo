import { Body, Controller, Get, Inject, Put, Req, UseGuards, ValidationPipe } from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'

import type { AuthenticatedRequest } from '../../auth/auth-request.js'
import { RequirePermissions } from '../../auth/decorators/require-permissions.js'
import { PermissionGuard } from '../../auth/guards/permission.guard.js'
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard.js'
import { TrustedOriginGuard } from '../../auth/guards/trusted-origin.guard.js'
import type { SystemSettings } from '../application/settings.contract.js'
import { SettingsService } from '../application/settings.service.js'
import {
  SettingsErrorResponseDto,
  SystemSettingsResponseDto,
  UpdateSystemSettingsDto,
} from '../dto/admin-settings.dto.js'

@ApiTags('admin-settings')
@ApiCookieAuth('session')
@RequirePermissions('setting.read')
@UseGuards(SessionAuthGuard, TrustedOriginGuard, PermissionGuard)
@Controller({ path: 'admin/settings', version: '1' })
export class AdminSettingsController {
  constructor(@Inject(SettingsService) private readonly service: SettingsService) {}

  @Get()
  @ApiOperation({ operationId: 'getAdminSettings', summary: 'Get system settings' })
  @ApiOkResponse({ type: SystemSettingsResponseDto })
  @ApiUnauthorizedResponse({ type: SettingsErrorResponseDto })
  @ApiForbiddenResponse({ type: SettingsErrorResponseDto })
  getSettings(): Promise<SystemSettings> {
    return this.service.getSettings()
  }

  @Put()
  @RequirePermissions('setting.update')
  @ApiOperation({ operationId: 'updateAdminSettings', summary: 'Update system settings' })
  @ApiBody({ type: UpdateSystemSettingsDto })
  @ApiOkResponse({ type: SystemSettingsResponseDto })
  @ApiBadRequestResponse({ type: SettingsErrorResponseDto })
  @ApiUnauthorizedResponse({ type: SettingsErrorResponseDto })
  @ApiForbiddenResponse({ type: SettingsErrorResponseDto })
  updateSettings(
    @Body(validationPipe(UpdateSystemSettingsDto)) body: UpdateSystemSettingsDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<SystemSettings> {
    return this.service.updateSettings({
      actorId: authenticatedUserId(request),
      settings: body,
    })
  }
}

function validationPipe(expectedType: new () => object): ValidationPipe {
  return new ValidationPipe({
    expectedType,
    forbidNonWhitelisted: true,
    transform: true,
    whitelist: true,
  })
}

function authenticatedUserId(request: AuthenticatedRequest): string {
  if (!request.auth) throw new Error('SessionAuthGuard did not populate the authenticated user.')
  return request.auth.user.id
}
