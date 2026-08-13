import { createHash } from 'node:crypto'

import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  HttpException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger'

import { InternalServiceGuard } from '../../system/internal-service.guard.js'
import { ArticlePublicationError } from '../application/article-publication.errors.js'
import { ArticlesService } from '../application/articles.service.js'
import {
  InternalCommandErrorResponseDto,
  PublishScheduledArticleRequestDto,
  PublishScheduledArticleResponseDto,
} from '../dto/publish-scheduled-article.dto.js'
import type { PublishScheduledArticleParamsDto } from '../dto/publish-scheduled-article.dto.js'

@ApiTags('internal-articles')
@ApiBearerAuth('internal-workload')
@UseGuards(InternalServiceGuard)
@Controller({ path: 'internal/articles', version: '1' })
export class InternalArticlesController {
  constructor(@Inject(ArticlesService) private readonly articlesService: ArticlesService) {}

  @Post(':articleId/publish-scheduled')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'publishScheduledArticle',
    summary: 'Execute the canonical scheduled publication command',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'X-Correlation-ID', required: false })
  @ApiParam({ format: 'uuid', name: 'articleId', type: String })
  @ApiBody({ type: PublishScheduledArticleRequestDto })
  @ApiOkResponse({ type: PublishScheduledArticleResponseDto })
  @ApiBadRequestResponse({ type: InternalCommandErrorResponseDto })
  @ApiNotFoundResponse({ type: InternalCommandErrorResponseDto })
  @ApiConflictResponse({ type: InternalCommandErrorResponseDto })
  async publishScheduled(
    @Param() params: PublishScheduledArticleParamsDto,
    @Body() body: PublishScheduledArticleRequestDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-correlation-id') correlationId?: string,
  ): Promise<PublishScheduledArticleResponseDto> {
    if (body.contractVersion !== 1) {
      throw commandError(400, 'UNSUPPORTED_CONTRACT_VERSION')
    }
    const normalizedKey = idempotencyKey?.trim()
    if (!normalizedKey || normalizedKey.length > 200) {
      throw commandError(400, 'INVALID_IDEMPOTENCY_KEY')
    }

    try {
      return await this.articlesService.publishScheduled({
        articleId: params.articleId,
        idempotencyKey: normalizedKey,
        requestHash: createHash('sha256')
          .update(
            JSON.stringify({
              articleId: params.articleId,
              contractVersion: body.contractVersion,
              scheduleVersion: body.scheduleVersion,
            }),
          )
          .digest('hex'),
        scheduleVersion: body.scheduleVersion,
        ...(correlationId?.trim() ? { correlationId: correlationId.trim() } : {}),
      })
    } catch (error) {
      if (!(error instanceof ArticlePublicationError)) throw error
      if (error.code === 'ARTICLE_NOT_FOUND') {
        throw commandError(404, error.code)
      }
      throw commandError(409, error.code)
    }
  }
}

function commandError(statusCode: number, code: string): HttpException {
  return new HttpException(
    { code, message: 'The scheduled publication command could not be completed.', statusCode },
    statusCode,
  )
}
