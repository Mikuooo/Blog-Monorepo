import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'

import type { AuthenticatedRequest } from '../../auth/auth-request.js'
import { RequirePermissions } from '../../auth/decorators/require-permissions.js'
import { PermissionGuard } from '../../auth/guards/permission.guard.js'
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard.js'
import { TrustedOriginGuard } from '../../auth/guards/trusted-origin.guard.js'
import type { AdminUserListItem, PageResult } from '../application/access-control.contract.js'
import { AccessControlService } from '../application/access-control.service.js'
import {
  AccessControlErrorResponseDto,
  AdminUserListItemDto,
  AdminUserListResponseDto,
  UpdateUserRolesDto,
  UpdateUserStatusDto,
  UserListQueryDto,
} from '../dto/admin-access-control.dto.js'
import { authenticatedUserId, handleAccessControl, validationPipe } from './access-control-http.js'

@ApiTags('admin-users')
@ApiCookieAuth('session')
@RequirePermissions('user.read')
@UseGuards(SessionAuthGuard, TrustedOriginGuard, PermissionGuard)
@Controller({ path: 'admin/users', version: '1' })
export class AdminUsersController {
  constructor(@Inject(AccessControlService) private readonly service: AccessControlService) {}

  @Get()
  @ApiOperation({ operationId: 'listAdminUsers', summary: 'List administration users' })
  @ApiQuery({ maxLength: 120, name: 'keyword', required: false, type: String })
  @ApiQuery({ default: 1, minimum: 1, name: 'page', required: false, type: Number })
  @ApiQuery({
    default: 20,
    maximum: 100,
    minimum: 1,
    name: 'pageSize',
    required: false,
    type: Number,
  })
  @ApiQuery({ enum: ['ACTIVE', 'DISABLED'], name: 'status', required: false })
  @ApiOkResponse({ type: AdminUserListResponseDto })
  @ApiBadRequestResponse({ type: AccessControlErrorResponseDto })
  @ApiUnauthorizedResponse({ type: AccessControlErrorResponseDto })
  @ApiForbiddenResponse({ type: AccessControlErrorResponseDto })
  list(
    @Query(validationPipe(UserListQueryDto)) query: UserListQueryDto,
  ): Promise<PageResult<AdminUserListItem>> {
    return this.service.listUsers({
      page: query.page,
      pageSize: query.pageSize,
      ...(query.keyword ? { keyword: query.keyword } : {}),
      ...(query.status ? { status: query.status } : {}),
    })
  }

  @Patch(':userId/status')
  @RequirePermissions('user.disable')
  @ApiOperation({ operationId: 'updateAdminUserStatus', summary: 'Update user status' })
  @ApiParam({ format: 'uuid', name: 'userId', type: String })
  @ApiBody({ type: UpdateUserStatusDto })
  @ApiOkResponse({ type: AdminUserListItemDto })
  @ApiBadRequestResponse({ type: AccessControlErrorResponseDto })
  @ApiNotFoundResponse({ type: AccessControlErrorResponseDto })
  @ApiConflictResponse({ type: AccessControlErrorResponseDto })
  updateStatus(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body(validationPipe(UpdateUserStatusDto)) body: UpdateUserStatusDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<AdminUserListItem> {
    return handleAccessControl(() =>
      this.service.updateUserStatus({
        actorId: authenticatedUserId(request),
        status: body.status,
        userId,
      }),
    )
  }

  @Patch(':userId/roles')
  @RequirePermissions('user.update')
  @ApiOperation({ operationId: 'updateAdminUserRoles', summary: 'Replace user roles' })
  @ApiParam({ format: 'uuid', name: 'userId', type: String })
  @ApiBody({ type: UpdateUserRolesDto })
  @ApiOkResponse({ type: AdminUserListItemDto })
  @ApiBadRequestResponse({ type: AccessControlErrorResponseDto })
  @ApiNotFoundResponse({ type: AccessControlErrorResponseDto })
  @ApiConflictResponse({ type: AccessControlErrorResponseDto })
  updateRoles(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body(validationPipe(UpdateUserRolesDto)) body: UpdateUserRolesDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<AdminUserListItem> {
    return handleAccessControl(() =>
      this.service.updateUserRoles({
        actorId: authenticatedUserId(request),
        roleIds: body.roleIds,
        userId,
      }),
    )
  }
}
