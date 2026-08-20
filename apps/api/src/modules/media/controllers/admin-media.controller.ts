import { Body, Controller, Delete, Get, HttpCode, HttpException, Inject, Param, Post, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common'
import { ApiCookieAuth, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../../auth/auth-request.js'
import { RequirePermissions } from '../../auth/decorators/require-permissions.js'
import { PermissionGuard } from '../../auth/guards/permission.guard.js'
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard.js'
import { TrustedOriginGuard } from '../../auth/guards/trusted-origin.guard.js'
import type { MediaListResult, MediaRecord } from '../application/media.contract.js'
import { MediaError } from '../application/media.errors.js'
import { MediaService } from '../application/media.service.js'
import { CompleteMediaUploadDto, CreateMediaUploadUrlDto, MediaDownloadUrlResponseDto, MediaListQueryDto, MediaListResponseDto, MediaParamsDto, MediaResponseDto, MediaUploadUrlResponseDto } from '../dto/admin-media.dto.js'

const pipe = (expectedType: new () => object) => new ValidationPipe({ expectedType, forbidNonWhitelisted: true, transform: true, whitelist: true })
@ApiTags('admin-media') @ApiCookieAuth('session') @RequirePermissions('media.read') @UseGuards(SessionAuthGuard, TrustedOriginGuard, PermissionGuard)
@Controller({ path: 'admin/media', version: '1' })
export class AdminMediaController {
  constructor(@Inject(MediaService) private readonly service: MediaService) {}
  @Post('upload-url') @RequirePermissions('media.upload') @ApiOperation({ operationId: 'createAdminMediaUploadUrl' }) @ApiCreatedResponse({ type: MediaUploadUrlResponseDto })
  uploadUrl(@Body(pipe(CreateMediaUploadUrlDto)) body: CreateMediaUploadUrlDto, @Req() request: AuthenticatedRequest) { return handle(() => this.service.createUploadUrl({ ...body, actorId: actorId(request) })) }
  @Post('complete') @RequirePermissions('media.upload') @ApiOperation({ operationId: 'completeAdminMediaUpload' }) @ApiCreatedResponse({ type: MediaResponseDto })
  complete(@Body(pipe(CompleteMediaUploadDto)) body: CompleteMediaUploadDto, @Req() request: AuthenticatedRequest): Promise<MediaRecord> { return handle(() => this.service.complete({ ...body, actorId: actorId(request) })) }
  @Get() @ApiOperation({ operationId: 'listAdminMedia' }) @ApiOkResponse({ type: MediaListResponseDto })
  list(@Query(pipe(MediaListQueryDto)) query: MediaListQueryDto): Promise<MediaListResult> { return this.service.list(query) }
  @Get(':mediaId/download-url') @ApiOperation({ operationId: 'getAdminMediaDownloadUrl' }) @ApiOkResponse({ type: MediaDownloadUrlResponseDto })
  download(@Param(pipe(MediaParamsDto)) params: MediaParamsDto) { return handle(() => this.service.downloadUrl(params.mediaId)) }
  @Get(':mediaId') @ApiOperation({ operationId: 'getAdminMedia' }) @ApiOkResponse({ type: MediaResponseDto }) @ApiNotFoundResponse()
  get(@Param(pipe(MediaParamsDto)) params: MediaParamsDto) { return handle(() => this.service.getById(params.mediaId)) }
  @Delete(':mediaId') @HttpCode(204) @RequirePermissions('media.delete') @ApiOperation({ operationId: 'deleteAdminMedia' }) @ApiNoContentResponse()
  delete(@Param(pipe(MediaParamsDto)) params: MediaParamsDto) { return handle(() => this.service.delete(params.mediaId)) }
}
function actorId(request: AuthenticatedRequest): string { if (!request.auth) throw new Error('SessionAuthGuard did not populate the authenticated user.'); return request.auth.user.id }
async function handle<T>(action: () => Promise<T>): Promise<T> { try { return await action() } catch (error) { if (!(error instanceof MediaError)) throw error; const status = error.code === 'MEDIA_NOT_FOUND' ? 404 : 400; throw new HttpException({ code: error.code, message: error.code, statusCode: status }, status) } }
