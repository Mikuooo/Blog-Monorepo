import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class PublicArticleListQueryDto {
  @ApiPropertyOptional({ maxLength: 120 }) @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsOptional() @IsString() @MaxLength(120) keyword?: string
  @ApiPropertyOptional({ maxLength: 120 }) @IsOptional() @IsString() @MaxLength(120) categorySlug?: string
  @ApiPropertyOptional({ maxLength: 120 }) @IsOptional() @IsString() @MaxLength(120) tagSlug?: string
  @ApiPropertyOptional({ default: 1, minimum: 1 }) @Type(() => Number) @IsOptional() @IsInt() @Min(1) page = 1
  @ApiPropertyOptional({ default: 20, maximum: 100, minimum: 1 }) @Type(() => Number) @IsOptional() @IsInt() @Min(1) @Max(100) pageSize = 20
}

export class PublicArticleSlugParamsDto { @ApiProperty({ type: String }) @IsString() slug!: string }

export class PublicArticleResponseDto {
  @ApiProperty({ type: String }) id!: string; @ApiProperty({ type: String }) title!: string; @ApiProperty({ type: String }) slug!: string; @ApiProperty({ nullable: true, type: String }) summary!: string | null; @ApiProperty({ type: String }) publishedAt!: string; @ApiProperty({ type: Number }) readingTime!: number; @ApiProperty({ type: Boolean }) isPinned!: boolean; @ApiProperty({ type: Boolean }) isFeatured!: boolean
  @ApiProperty({ type: Object }) author!: { displayName: string; username: string }; @ApiProperty({ nullable: true, type: Object }) category!: unknown; @ApiProperty({ nullable: true, type: Object }) cover!: unknown; @ApiProperty({ isArray: true, type: Object }) tags!: unknown[]
}
export class PublicArticleDetailResponseDto extends PublicArticleResponseDto { @ApiProperty({ type: String }) content!: string; @ApiProperty({ nullable: true, type: String }) contentHtml!: string | null; @ApiProperty({ type: Boolean }) allowComment!: boolean; @ApiProperty({ nullable: true, type: String }) canonicalUrl!: string | null; @ApiProperty({ nullable: true, type: String }) seoTitle!: string | null; @ApiProperty({ nullable: true, type: String }) seoDescription!: string | null; @ApiProperty({ type: String }) updatedAt!: string; @ApiProperty({ type: Number }) wordCount!: number }
export class PublicArticleListResponseDto { @ApiProperty({ isArray: true, type: PublicArticleResponseDto }) items!: PublicArticleResponseDto[]; @ApiProperty({ type: Number }) page!: number; @ApiProperty({ type: Number }) pageSize!: number; @ApiProperty({ type: Number }) total!: number; @ApiProperty({ type: Number }) totalPages!: number }
