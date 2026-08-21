import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
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
import type { AdminArticleCommandResult } from '../application/admin-article-command.contract.js'
import { AdminArticleCommandError } from '../application/admin-article-command.errors.js'
import { AdminArticleCommandService } from '../application/admin-article-command.service.js'
import type {
  AdminArticleDetail,
  AdminArticleListResult,
} from '../application/article-query.contract.js'
import { ArticleQueryError } from '../application/article-query.errors.js'
import { AdminArticleQueryService } from '../application/admin-article-query.service.js'
import {
  AdminArticleCommandResponseDto,
  AdminArticleVersionCommandDto,
  CreateAdminArticleDto,
  ScheduleAdminArticleDto,
  UpdateAdminArticleDto,
} from '../dto/admin-article-command.dto.js'
import {
  AdminArticleDetailDto,
  AdminArticleErrorResponseDto,
  AdminArticleListQueryDto,
  AdminArticleListResponseDto,
} from '../dto/admin-article-query.dto.js'
import type { AdminArticleParamsDto } from '../dto/admin-article-query.dto.js'

@ApiTags('admin-articles')
@ApiExtraModels(AdminArticleListQueryDto)
@ApiCookieAuth('session')
@RequirePermissions('article.read')
@UseGuards(SessionAuthGuard, TrustedOriginGuard, PermissionGuard)
@Controller({ path: 'admin/articles', version: '1' })
export class AdminArticlesController {
  constructor(
    @Inject(AdminArticleCommandService)
    private readonly articleCommandService: AdminArticleCommandService,
    @Inject(AdminArticleQueryService)
    private readonly articleQueryService: AdminArticleQueryService,
  ) {}

  @Post()
  @RequirePermissions('article.create')
  @ApiOperation({ operationId: 'createAdminArticle', summary: 'Create an article draft' })
  @ApiBody({ type: CreateAdminArticleDto })
  @ApiCreatedResponse({ type: AdminArticleCommandResponseDto })
  @ApiBadRequestResponse({ type: AdminArticleErrorResponseDto })
  @ApiUnauthorizedResponse({ type: AdminArticleErrorResponseDto })
  @ApiForbiddenResponse({ type: AdminArticleErrorResponseDto })
  @ApiConflictResponse({ type: AdminArticleErrorResponseDto })
  async create(
    @Body(
      new ValidationPipe({
        expectedType: CreateAdminArticleDto,
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    )
    body: CreateAdminArticleDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<AdminArticleCommandResult> {
    const actorId = authenticatedUserId(request)
    return handleCommand(() => this.articleCommandService.create({ ...body, actorId }))
  }

  @Get()
  @ApiOperation({ operationId: 'listAdminArticles', summary: 'List administration articles' })
  @ApiQuery({ format: 'uuid', name: 'categoryId', required: false, type: String })
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
  @ApiQuery({
    enum: ['ARCHIVED', 'DRAFT', 'PUBLISHED', 'SCHEDULED'],
    name: 'status',
    required: false,
  })
  @ApiOkResponse({ type: AdminArticleListResponseDto })
  @ApiBadRequestResponse({ type: AdminArticleErrorResponseDto })
  @ApiUnauthorizedResponse({ type: AdminArticleErrorResponseDto })
  @ApiForbiddenResponse({ type: AdminArticleErrorResponseDto })
  list(
    @Query(
      new ValidationPipe({
        expectedType: AdminArticleListQueryDto,
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    )
    query: AdminArticleListQueryDto,
  ): Promise<AdminArticleListResult> {
    return this.articleQueryService.list({
      page: query.page,
      pageSize: query.pageSize,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.keyword ? { keyword: query.keyword } : {}),
      ...(query.status ? { status: query.status } : {}),
    })
  }

  @Get(':articleId')
  @ApiOperation({ operationId: 'getAdminArticle', summary: 'Get an administration article' })
  @ApiOkResponse({ type: AdminArticleDetailDto })
  @ApiParam({ format: 'uuid', name: 'articleId', type: String })
  @ApiBadRequestResponse({ type: AdminArticleErrorResponseDto })
  @ApiUnauthorizedResponse({ type: AdminArticleErrorResponseDto })
  @ApiForbiddenResponse({ type: AdminArticleErrorResponseDto })
  @ApiNotFoundResponse({ type: AdminArticleErrorResponseDto })
  async getById(@Param() params: AdminArticleParamsDto): Promise<AdminArticleDetail> {
    try {
      return await this.articleQueryService.getById(params.articleId)
    } catch (error) {
      if (!(error instanceof ArticleQueryError)) throw error
      throw new HttpException(
        {
          code: error.code,
          message: 'The requested article was not found.',
          statusCode: 404,
        },
        404,
      )
    }
  }

  @Patch(':articleId')
  @RequirePermissions('article.update')
  @ApiOperation({ operationId: 'updateAdminArticle', summary: 'Update an article' })
  @ApiParam({ format: 'uuid', name: 'articleId', type: String })
  @ApiBody({ type: UpdateAdminArticleDto })
  @ApiOkResponse({ type: AdminArticleCommandResponseDto })
  @ApiBadRequestResponse({ type: AdminArticleErrorResponseDto })
  @ApiUnauthorizedResponse({ type: AdminArticleErrorResponseDto })
  @ApiForbiddenResponse({ type: AdminArticleErrorResponseDto })
  @ApiNotFoundResponse({ type: AdminArticleErrorResponseDto })
  @ApiConflictResponse({ type: AdminArticleErrorResponseDto })
  update(
    @Param() params: AdminArticleParamsDto,
    @Body() body: UpdateAdminArticleDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<AdminArticleCommandResult> {
    return handleCommand(() =>
      this.articleCommandService.update({
        ...body,
        actorId: authenticatedUserId(request),
        articleId: params.articleId,
      }),
    )
  }

  @Post(':articleId/publish')
  @HttpCode(200)
  @RequirePermissions('article.publish')
  @ApiOperation({ operationId: 'publishAdminArticle', summary: 'Publish an article immediately' })
  @ApiParam({ format: 'uuid', name: 'articleId', type: String })
  @ApiBody({ type: AdminArticleVersionCommandDto })
  @ApiOkResponse({ type: AdminArticleCommandResponseDto })
  @ApiBadRequestResponse({ type: AdminArticleErrorResponseDto })
  @ApiUnauthorizedResponse({ type: AdminArticleErrorResponseDto })
  @ApiForbiddenResponse({ type: AdminArticleErrorResponseDto })
  @ApiNotFoundResponse({ type: AdminArticleErrorResponseDto })
  @ApiConflictResponse({ type: AdminArticleErrorResponseDto })
  publish(
    @Param() params: AdminArticleParamsDto,
    @Body() body: AdminArticleVersionCommandDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<AdminArticleCommandResult> {
    return handleCommand(() =>
      this.articleCommandService.publish({
        actorId: authenticatedUserId(request),
        articleId: params.articleId,
        expectedVersion: body.expectedVersion,
      }),
    )
  }

  @Post(':articleId/schedule')
  @HttpCode(200)
  @RequirePermissions('article.publish')
  @ApiOperation({ operationId: 'scheduleAdminArticle', summary: 'Schedule article publication' })
  @ApiParam({ format: 'uuid', name: 'articleId', type: String })
  @ApiBody({ type: ScheduleAdminArticleDto })
  @ApiOkResponse({ type: AdminArticleCommandResponseDto })
  @ApiBadRequestResponse({ type: AdminArticleErrorResponseDto })
  @ApiUnauthorizedResponse({ type: AdminArticleErrorResponseDto })
  @ApiForbiddenResponse({ type: AdminArticleErrorResponseDto })
  @ApiNotFoundResponse({ type: AdminArticleErrorResponseDto })
  @ApiConflictResponse({ type: AdminArticleErrorResponseDto })
  schedule(
    @Param() params: AdminArticleParamsDto,
    @Body() body: ScheduleAdminArticleDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<AdminArticleCommandResult> {
    return handleCommand(() =>
      this.articleCommandService.schedule({
        actorId: authenticatedUserId(request),
        articleId: params.articleId,
        expectedVersion: body.expectedVersion,
        scheduledAt: body.scheduledAt,
      }),
    )
  }

  @Post(':articleId/cancel-schedule')
  @HttpCode(200)
  @RequirePermissions('article.publish')
  @ApiOperation({
    operationId: 'cancelAdminArticleSchedule',
    summary: 'Cancel publication scheduling',
  })
  @ApiParam({ format: 'uuid', name: 'articleId', type: String })
  @ApiBody({ type: AdminArticleVersionCommandDto })
  @ApiOkResponse({ type: AdminArticleCommandResponseDto })
  @ApiBadRequestResponse({ type: AdminArticleErrorResponseDto })
  @ApiUnauthorizedResponse({ type: AdminArticleErrorResponseDto })
  @ApiForbiddenResponse({ type: AdminArticleErrorResponseDto })
  @ApiNotFoundResponse({ type: AdminArticleErrorResponseDto })
  @ApiConflictResponse({ type: AdminArticleErrorResponseDto })
  cancelSchedule(
    @Param() params: AdminArticleParamsDto,
    @Body() body: AdminArticleVersionCommandDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<AdminArticleCommandResult> {
    return handleCommand(() =>
      this.articleCommandService.cancelSchedule({
        actorId: authenticatedUserId(request),
        articleId: params.articleId,
        expectedVersion: body.expectedVersion,
      }),
    )
  }

  @Post(':articleId/archive')
  @HttpCode(200)
  @RequirePermissions('article.publish')
  @ApiOperation({ operationId: 'archiveAdminArticle', summary: 'Archive an article' })
  @ApiParam({ format: 'uuid', name: 'articleId', type: String })
  @ApiBody({ type: AdminArticleVersionCommandDto })
  @ApiOkResponse({ type: AdminArticleCommandResponseDto })
  @ApiBadRequestResponse({ type: AdminArticleErrorResponseDto })
  @ApiUnauthorizedResponse({ type: AdminArticleErrorResponseDto })
  @ApiForbiddenResponse({ type: AdminArticleErrorResponseDto })
  @ApiNotFoundResponse({ type: AdminArticleErrorResponseDto })
  @ApiConflictResponse({ type: AdminArticleErrorResponseDto })
  archive(
    @Param() params: AdminArticleParamsDto,
    @Body() body: AdminArticleVersionCommandDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<AdminArticleCommandResult> {
    return handleCommand(() =>
      this.articleCommandService.archive({
        actorId: authenticatedUserId(request),
        articleId: params.articleId,
        expectedVersion: body.expectedVersion,
      }),
    )
  }
}

function authenticatedUserId(request: AuthenticatedRequest): string {
  if (!request.auth) {
    throw new HttpException(
      { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication is required.', statusCode: 401 },
      401,
    )
  }
  return request.auth.user.id
}

async function handleCommand(
  command: () => Promise<AdminArticleCommandResult>,
): Promise<AdminArticleCommandResult> {
  try {
    return await command()
  } catch (error) {
    if (!(error instanceof AdminArticleCommandError)) throw error
    const statusCode =
      error.code === 'ARTICLE_NOT_FOUND'
        ? 404
        : error.code === 'ARTICLE_SLUG_EXISTS' ||
            error.code === 'ARTICLE_VERSION_CONFLICT' ||
            error.code === 'ARTICLE_INVALID_STATE'
          ? 409
          : 400
    throw new HttpException(
      { code: error.code, message: commandErrorMessage(error.code), statusCode },
      statusCode,
    )
  }
}

function commandErrorMessage(code: AdminArticleCommandError['code']): string {
  const messages: Record<AdminArticleCommandError['code'], string> = {
    ARTICLE_CATEGORY_NOT_FOUND: 'The selected category was not found.',
    ARTICLE_COVER_NOT_FOUND: 'The selected cover was not found.',
    ARTICLE_INVALID_SCHEDULE_TIME: 'The publication time must be in the future.',
    ARTICLE_INVALID_STATE: 'The article cannot perform this operation in its current state.',
    ARTICLE_NOT_FOUND: 'The requested article was not found.',
    ARTICLE_PASSWORD_MUTATION_CONFLICT: 'Set or clear the article password, but not both.',
    ARTICLE_PASSWORD_REQUIRED: 'Password visibility requires an article password.',
    ARTICLE_SLUG_EXISTS: 'The article slug is already in use.',
    ARTICLE_TAG_NOT_FOUND: 'One or more selected tags were not found.',
    ARTICLE_VERSION_CONFLICT: 'The article was changed by another request.',
  }
  return messages[code]
}
