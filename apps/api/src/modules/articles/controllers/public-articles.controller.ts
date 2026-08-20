import { Controller, Get, HttpException, Inject, Param, Query, ValidationPipe } from '@nestjs/common'
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminArticleQueryService } from '../application/admin-article-query.service.js'
import type { PublicArticleListResult } from '../application/article-query.contract.js'
import { ArticleQueryError } from '../application/article-query.errors.js'
import { PublicArticleDetailResponseDto, PublicArticleListResponseDto } from '../dto/public-article.dto.js'
import type { PublicArticleListQueryDto, PublicArticleSlugParamsDto } from '../dto/public-article.dto.js'

@ApiTags('public-articles')
@Controller({ path: 'public/articles', version: '1' })
export class PublicArticlesController {
  constructor(@Inject(AdminArticleQueryService) private readonly service: AdminArticleQueryService) {}

  @Get()
  @ApiOperation({ operationId: 'listPublicArticles', summary: 'List published public articles' })
  @ApiOkResponse({ type: PublicArticleListResponseDto })
  list(@Query(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) query: PublicArticleListQueryDto): Promise<PublicArticleListResult> {
    return this.service.listPublic(query)
  }

  @Get('search')
  @ApiOperation({ operationId: 'searchPublicArticles', summary: 'Search published public articles' })
  @ApiOkResponse({ type: PublicArticleListResponseDto })
  search(@Query(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) query: PublicArticleListQueryDto): Promise<PublicArticleListResult> {
    return this.service.listPublic(query)
  }

  @Get(':slug')
  @ApiOperation({ operationId: 'getPublicArticle', summary: 'Get a published public article' })
  @ApiOkResponse({ type: PublicArticleDetailResponseDto })
  @ApiNotFoundResponse()
  async get(@Param(new ValidationPipe({ transform: true, whitelist: true })) params: PublicArticleSlugParamsDto) {
    try { return await this.service.getPublicBySlug(params.slug) } catch (error) {
      if (!(error instanceof ArticleQueryError)) throw error
      throw new HttpException({ code: error.code, message: 'The requested article was not found.', statusCode: 404 }, 404)
    }
  }
}
