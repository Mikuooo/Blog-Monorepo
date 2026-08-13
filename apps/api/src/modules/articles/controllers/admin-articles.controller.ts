import { Controller, Get, HttpException, Inject, Param, Query, UseGuards } from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'

import { RequirePermissions } from '../../auth/decorators/require-permissions.js'
import { PermissionGuard } from '../../auth/guards/permission.guard.js'
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard.js'
import type {
  AdminArticleDetail,
  AdminArticleListResult,
} from '../application/article-query.contract.js'
import { ArticleQueryError } from '../application/article-query.errors.js'
import { AdminArticleQueryService } from '../application/admin-article-query.service.js'
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
@UseGuards(SessionAuthGuard, PermissionGuard)
@Controller({ path: 'admin/articles', version: '1' })
export class AdminArticlesController {
  constructor(
    @Inject(AdminArticleQueryService)
    private readonly articleQueryService: AdminArticleQueryService,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'listAdminArticles', summary: 'List administration articles' })
  @ApiOkResponse({ type: AdminArticleListResponseDto })
  @ApiBadRequestResponse({ type: AdminArticleErrorResponseDto })
  @ApiUnauthorizedResponse({ type: AdminArticleErrorResponseDto })
  @ApiForbiddenResponse({ type: AdminArticleErrorResponseDto })
  list(@Query() query: AdminArticleListQueryDto): Promise<AdminArticleListResult> {
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
}
