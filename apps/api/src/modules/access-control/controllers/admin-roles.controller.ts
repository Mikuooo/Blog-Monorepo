import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
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
import type {
  AdminRoleListItem,
  DeleteRoleResult,
  PageResult,
  PermissionSummary,
} from '../application/access-control.contract.js'
import { AccessControlService } from '../application/access-control.service.js'
import {
  AccessControlErrorResponseDto,
  AccessControlListQueryDto,
  AdminRoleListItemDto,
  AdminRoleListResponseDto,
  CreateRoleDto,
  DeleteRoleResponseDto,
  PermissionSummaryDto,
  UpdateRoleDto,
} from '../dto/admin-access-control.dto.js'
import { authenticatedUserId, handleAccessControl, validationPipe } from './access-control-http.js'

@ApiTags('admin-roles')
@ApiCookieAuth('session')
@RequirePermissions('role.read')
@UseGuards(SessionAuthGuard, TrustedOriginGuard, PermissionGuard)
@Controller({ path: 'admin/roles', version: '1' })
export class AdminRolesController {
  constructor(@Inject(AccessControlService) private readonly service: AccessControlService) {}

  @Get()
  @ApiOperation({ operationId: 'listAdminRoles', summary: 'List roles' })
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
  @ApiOkResponse({ type: AdminRoleListResponseDto })
  @ApiBadRequestResponse({ type: AccessControlErrorResponseDto })
  @ApiUnauthorizedResponse({ type: AccessControlErrorResponseDto })
  @ApiForbiddenResponse({ type: AccessControlErrorResponseDto })
  list(
    @Query(validationPipe(AccessControlListQueryDto)) query: AccessControlListQueryDto,
  ): Promise<PageResult<AdminRoleListItem>> {
    return this.service.listRoles(query)
  }

  @Get('permissions')
  @ApiOperation({ operationId: 'listAdminPermissions', summary: 'List permissions' })
  @ApiOkResponse({ isArray: true, type: PermissionSummaryDto })
  listPermissions(): Promise<PermissionSummary[]> {
    return this.service.listPermissions()
  }

  @Post()
  @RequirePermissions('role.create')
  @ApiOperation({ operationId: 'createAdminRole', summary: 'Create a role' })
  @ApiBody({ type: CreateRoleDto })
  @ApiCreatedResponse({ type: AdminRoleListItemDto })
  @ApiBadRequestResponse({ type: AccessControlErrorResponseDto })
  @ApiConflictResponse({ type: AccessControlErrorResponseDto })
  create(
    @Body(validationPipe(CreateRoleDto)) body: CreateRoleDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<AdminRoleListItem> {
    return handleAccessControl(() =>
      this.service.createRole({ ...body, actorId: authenticatedUserId(request) }),
    )
  }

  @Patch(':roleId')
  @RequirePermissions('role.update')
  @ApiOperation({ operationId: 'updateAdminRole', summary: 'Update a role' })
  @ApiParam({ format: 'uuid', name: 'roleId', type: String })
  @ApiBody({ type: UpdateRoleDto })
  @ApiOkResponse({ type: AdminRoleListItemDto })
  @ApiBadRequestResponse({ type: AccessControlErrorResponseDto })
  @ApiNotFoundResponse({ type: AccessControlErrorResponseDto })
  @ApiConflictResponse({ type: AccessControlErrorResponseDto })
  update(
    @Param('roleId', new ParseUUIDPipe()) roleId: string,
    @Body(validationPipe(UpdateRoleDto)) body: UpdateRoleDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<AdminRoleListItem> {
    return handleAccessControl(() =>
      this.service.updateRole({ ...body, actorId: authenticatedUserId(request), roleId }),
    )
  }

  @Delete(':roleId')
  @RequirePermissions('role.delete')
  @ApiOperation({ operationId: 'deleteAdminRole', summary: 'Delete a role' })
  @ApiParam({ format: 'uuid', name: 'roleId', type: String })
  @ApiOkResponse({ type: DeleteRoleResponseDto })
  @ApiBadRequestResponse({ type: AccessControlErrorResponseDto })
  @ApiNotFoundResponse({ type: AccessControlErrorResponseDto })
  @ApiConflictResponse({ type: AccessControlErrorResponseDto })
  delete(
    @Param('roleId', new ParseUUIDPipe()) roleId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<DeleteRoleResult> {
    return handleAccessControl(() => this.service.deleteRole(roleId, authenticatedUserId(request)))
  }
}
