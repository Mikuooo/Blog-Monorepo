import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator'

import type { ArticleStatus, ArticleVisibility } from '../application/article-query.contract.js'

const ARTICLE_STATUSES = ['ARCHIVED', 'DRAFT', 'PUBLISHED', 'SCHEDULED'] as const

export class AdminArticleListQueryDto {
  @ApiProperty({ format: 'uuid', required: false, type: String })
  @IsOptional()
  @IsUUID()
  categoryId?: string

  @ApiProperty({ maxLength: 120, required: false, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  keyword?: string

  @ApiProperty({ default: 1, minimum: 1, required: false, type: Number })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1

  @ApiProperty({ default: 20, maximum: 100, minimum: 1, required: false, type: Number })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize: number = 20

  @ApiProperty({ enum: ARTICLE_STATUSES, required: false, type: String })
  @IsOptional()
  @IsIn(ARTICLE_STATUSES)
  status?: ArticleStatus
}

export class AdminArticleParamsDto {
  @ApiProperty({ format: 'uuid', type: String })
  @IsUUID()
  articleId!: string
}

export class ArticleAuthorSummaryDto {
  @ApiProperty({ type: String })
  displayName!: string

  @ApiProperty({ format: 'uuid', type: String })
  id!: string

  @ApiProperty({ type: String })
  username!: string
}

export class ArticleCategorySummaryDto {
  @ApiProperty({ format: 'uuid', type: String })
  id!: string

  @ApiProperty({ type: String })
  name!: string

  @ApiProperty({ type: String })
  slug!: string
}

export class ArticleTagSummaryDto extends ArticleCategorySummaryDto {}

export class AdminArticleListItemDto {
  @ApiProperty({ type: ArticleAuthorSummaryDto })
  author!: ArticleAuthorSummaryDto

  @ApiProperty({ nullable: true, type: ArticleCategorySummaryDto })
  category!: ArticleCategorySummaryDto | null

  @ApiProperty({ type: Number })
  commentCount!: number

  @ApiProperty({ format: 'uuid', type: String })
  id!: string

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  publishedAt!: string | null

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  scheduledAt!: string | null

  @ApiProperty({ type: String })
  slug!: string

  @ApiProperty({ enum: ARTICLE_STATUSES, type: String })
  status!: ArticleStatus

  @ApiProperty({ nullable: true, type: String })
  summary!: string | null

  @ApiProperty({ type: String })
  title!: string

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: string

  @ApiProperty({ example: '12840', pattern: '^\\d+$', type: String })
  viewCount!: string

  @ApiProperty({ enum: ['PASSWORD', 'PRIVATE', 'PUBLIC'], type: String })
  visibility!: ArticleVisibility
}

export class AdminArticleListResponseDto {
  @ApiProperty({ isArray: true, type: AdminArticleListItemDto })
  items!: AdminArticleListItemDto[]

  @ApiProperty({ type: Number })
  page!: number

  @ApiProperty({ type: Number })
  pageSize!: number

  @ApiProperty({ type: Number })
  total!: number

  @ApiProperty({ type: Number })
  totalPages!: number
}

export class ArticleCoverDto {
  @ApiProperty({ nullable: true, type: Number })
  height!: number | null

  @ApiProperty({ format: 'uuid', type: String })
  id!: string

  @ApiProperty({ type: String })
  mimeType!: string

  @ApiProperty({ type: String })
  url!: string

  @ApiProperty({ nullable: true, type: Number })
  width!: number | null
}

export class AdminArticleDetailDto extends AdminArticleListItemDto {
  @ApiProperty({ type: Boolean })
  allowComment!: boolean

  @ApiProperty({ nullable: true, type: String })
  canonicalUrl!: string | null

  @ApiProperty({ type: String })
  content!: string

  @ApiProperty({ nullable: true, type: String })
  contentHtml!: string | null

  @ApiProperty({ nullable: true, type: ArticleCoverDto })
  cover!: ArticleCoverDto | null

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: string

  @ApiProperty({ type: Boolean })
  isFeatured!: boolean

  @ApiProperty({ type: Boolean })
  isPinned!: boolean

  @ApiProperty({ type: Number })
  likeCount!: number

  @ApiProperty({ type: Boolean })
  passwordProtected!: boolean

  @ApiProperty({ type: Number })
  readingTime!: number

  @ApiProperty({ type: Number })
  scheduleVersion!: number

  @ApiProperty({ nullable: true, type: String })
  seoDescription!: string | null

  @ApiProperty({ nullable: true, type: String })
  seoTitle!: string | null

  @ApiProperty({ isArray: true, type: ArticleTagSummaryDto })
  tags!: ArticleTagSummaryDto[]

  @ApiProperty({ type: Number })
  version!: number

  @ApiProperty({ type: Number })
  wordCount!: number
}

export class AdminArticleErrorResponseDto {
  @ApiProperty({ example: 'ARTICLE_NOT_FOUND', type: String })
  code!: string

  @ApiProperty({ example: 'The requested article was not found.', type: String })
  message!: string

  @ApiProperty({ example: 404, type: Number })
  statusCode!: number
}
