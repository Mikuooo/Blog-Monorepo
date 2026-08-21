import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

import type {
  AdminArticleCommandResult,
  ArticleCommandStatus,
  ArticleCommandVisibility,
} from '../application/admin-article-command.contract.js'

const VISIBILITIES = ['PASSWORD', 'PRIVATE', 'PUBLIC'] as const
const STATUSES = ['ARCHIVED', 'DRAFT', 'PUBLISHED', 'SCHEDULED'] as const
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

export class CreateAdminArticleDto {
  @ApiPropertyOptional({ default: true, type: Boolean })
  @IsOptional()
  @IsBoolean()
  allowComment?: boolean

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  canonicalUrl?: string | null

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  @IsOptional()
  @IsUUID('all')
  categoryId?: string | null

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(1_000_000)
  content!: string

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  @IsOptional()
  @IsUUID('all')
  coverId?: string | null

  @ApiPropertyOptional({ default: false, type: Boolean })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean

  @ApiPropertyOptional({ default: false, type: Boolean })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean

  @ApiPropertyOptional({ description: 'Required when visibility is PASSWORD.', type: String })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  seoTitle?: string | null

  @ApiProperty({ example: 'transaction-boundaries', maxLength: 240, type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  @Matches(SLUG_PATTERN)
  slug!: string

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  summary?: string | null

  @ApiPropertyOptional({ format: 'uuid', isArray: true, maxItems: 50, type: String })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  tagIds?: string[]

  @ApiProperty({ maxLength: 240, type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string

  @ApiPropertyOptional({ default: 'PUBLIC', enum: VISIBILITIES, type: String })
  @IsOptional()
  @IsIn(VISIBILITIES)
  visibility?: ArticleCommandVisibility
}

export class UpdateAdminArticleDto {
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  allowComment?: boolean

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  canonicalUrl?: string | null

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  @IsOptional()
  @IsUUID('all')
  categoryId?: string | null

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  clearPassword?: boolean

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(1_000_000)
  content?: string

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  @IsOptional()
  @IsUUID('all')
  coverId?: string | null

  @ApiProperty({ minimum: 1, type: Number })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  seoTitle?: string | null

  @ApiPropertyOptional({ maxLength: 240, type: String })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  @Matches(SLUG_PATTERN)
  slug?: string

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  summary?: string | null

  @ApiPropertyOptional({ format: 'uuid', isArray: true, maxItems: 50, type: String })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  tagIds?: string[]

  @ApiPropertyOptional({ maxLength: 240, type: String })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title?: string

  @ApiPropertyOptional({ enum: VISIBILITIES, type: String })
  @IsOptional()
  @IsIn(VISIBILITIES)
  visibility?: ArticleCommandVisibility
}

export class AdminArticleVersionCommandDto {
  @ApiProperty({ minimum: 1, type: Number })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number
}

export class ScheduleAdminArticleDto extends AdminArticleVersionCommandDto {
  @ApiProperty({ format: 'date-time', type: String })
  @Type(() => Date)
  @IsDate()
  scheduledAt!: Date
}

export class AdminArticleCommandResponseDto implements AdminArticleCommandResult {
  @ApiProperty({ format: 'uuid', type: String })
  articleId!: string

  @ApiProperty({ type: Boolean })
  passwordProtected!: boolean

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  publishedAt!: string | null

  @ApiPropertyOptional({ format: 'uuid', type: String })
  revisionId?: string

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  scheduledAt!: string | null

  @ApiProperty({ minimum: 1, type: Number })
  scheduleVersion!: number

  @ApiProperty({ enum: STATUSES, type: String })
  status!: ArticleCommandStatus

  @ApiProperty({ minimum: 1, type: Number })
  version!: number
}
