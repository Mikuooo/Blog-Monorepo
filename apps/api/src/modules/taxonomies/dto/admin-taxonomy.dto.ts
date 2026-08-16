import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsInt,
  MinLength,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

export class TaxonomyListQueryDto {
  @ApiProperty({ maxLength: 120, required: false, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(1)
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
}

export class CreateCategoryDto {
  @ApiProperty({ maxLength: 2000, required: false, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @ApiProperty({ maxLength: 120, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  name!: string

  @ApiProperty({ format: 'uuid', required: false, type: String })
  @IsOptional()
  @IsUUID()
  parentId?: string

  @ApiProperty({ maxLength: 160, pattern: SLUG_PATTERN.source, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(160)
  @Matches(SLUG_PATTERN)
  slug!: string

  @ApiProperty({ default: 0, required: false, type: Number })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  sortOrder?: number
}

export class UpdateCategoryDto {
  @ApiProperty({ maxLength: 2000, required: false, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @ApiProperty({ maxLength: 120, required: false, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string

  @ApiProperty({ format: 'uuid', nullable: true, required: false, type: String })
  @IsOptional()
  @IsUUID()
  parentId?: string | null

  @ApiProperty({ maxLength: 160, pattern: SLUG_PATTERN.source, required: false, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(SLUG_PATTERN)
  slug?: string

  @ApiProperty({ required: false, type: Number })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  sortOrder?: number
}

export class CreateTagDto {
  @ApiProperty({ maxLength: 2000, required: false, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @ApiProperty({ maxLength: 120, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string

  @ApiProperty({ maxLength: 160, pattern: SLUG_PATTERN.source, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(160)
  @Matches(SLUG_PATTERN)
  slug!: string
}

export class UpdateTagDto {
  @ApiProperty({ maxLength: 2000, required: false, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @ApiProperty({ maxLength: 120, required: false, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string

  @ApiProperty({ maxLength: 160, pattern: SLUG_PATTERN.source, required: false, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(SLUG_PATTERN)
  slug?: string
}

export class TaxonomyParentDto {
  @ApiProperty({ format: 'uuid', type: String })
  id!: string

  @ApiProperty({ type: String })
  name!: string
}

export class CategoryListItemDto {
  @ApiProperty({ type: Number })
  articleCount!: number

  @ApiProperty({ type: Number })
  childCount!: number

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: string

  @ApiProperty({ nullable: true, type: String })
  description!: string | null

  @ApiProperty({ format: 'uuid', type: String })
  id!: string

  @ApiProperty({ type: String })
  name!: string

  @ApiProperty({ nullable: true, type: TaxonomyParentDto })
  parent!: TaxonomyParentDto | null

  @ApiProperty({ type: String })
  slug!: string

  @ApiProperty({ type: Number })
  sortOrder!: number

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: string
}

export class TagListItemDto {
  @ApiProperty({ type: Number })
  articleCount!: number

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: string

  @ApiProperty({ nullable: true, type: String })
  description!: string | null

  @ApiProperty({ format: 'uuid', type: String })
  id!: string

  @ApiProperty({ type: String })
  name!: string

  @ApiProperty({ type: String })
  slug!: string

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: string
}

export class CategoryListResponseDto {
  @ApiProperty({ isArray: true, type: CategoryListItemDto })
  items!: CategoryListItemDto[]

  @ApiProperty({ type: Number })
  page!: number

  @ApiProperty({ type: Number })
  pageSize!: number

  @ApiProperty({ type: Number })
  total!: number

  @ApiProperty({ type: Number })
  totalPages!: number
}

export class TagListResponseDto {
  @ApiProperty({ isArray: true, type: TagListItemDto })
  items!: TagListItemDto[]

  @ApiProperty({ type: Number })
  page!: number

  @ApiProperty({ type: Number })
  pageSize!: number

  @ApiProperty({ type: Number })
  total!: number

  @ApiProperty({ type: Number })
  totalPages!: number
}

export class TaxonomyDeleteResponseDto {
  @ApiProperty({ type: Number })
  articleCount!: number

  @ApiProperty({ format: 'uuid', type: String })
  id!: string
}

export class TaxonomyErrorResponseDto {
  @ApiProperty({ example: 'CATEGORY_NOT_FOUND', type: String })
  code!: string

  @ApiProperty({ example: 'The requested category was not found.', type: String })
  message!: string

  @ApiProperty({ example: 404, type: Number })
  statusCode!: number
}
