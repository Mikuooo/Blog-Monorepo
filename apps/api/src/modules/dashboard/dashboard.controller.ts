import { Controller, Get, Inject, UseGuards } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { RequirePermissions } from '../auth/decorators/require-permissions.js'
import { PermissionGuard } from '../auth/guards/permission.guard.js'
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js'
import { TrustedOriginGuard } from '../auth/guards/trusted-origin.guard.js'
import { DashboardService } from './dashboard.service.js'
@ApiTags('admin-dashboard') @ApiCookieAuth('session') @RequirePermissions('article.read') @UseGuards(SessionAuthGuard, TrustedOriginGuard, PermissionGuard) @Controller({ path: 'admin/dashboard', version: '1' }) export class DashboardController { constructor(@Inject(DashboardService) private readonly service: DashboardService) {} @Get('overview') @ApiOperation({ operationId: 'getAdminDashboardOverview' }) overview(): Promise<unknown> { return this.service.overview() } }
