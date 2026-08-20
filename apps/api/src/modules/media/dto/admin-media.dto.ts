import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator'
import type { MediaType } from '../application/media.contract.js'

const MEDIA_TYPES = ['AUDIO', 'DOCUMENT', 'IMAGE', 'OTHER', 'VIDEO'] as const
export class CreateMediaUploadUrlDto {
  @ApiProperty({ maxLength: 255, type: String }) @IsString() @MaxLength(255) originalName!: string
  @ApiProperty({ maxLength: 160, type: String }) @IsString() @MaxLength(160) @Matches(/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/) contentType!: string
  @ApiProperty({ minimum: 1, type: Number }) @IsInt() @Min(1) size!: number
}
export class CompleteMediaUploadDto { @ApiProperty({ maxLength: 1024, type: String }) @IsString() @MaxLength(1024) key!: string; @ApiProperty({ maxLength: 255, type: String }) @IsString() @MaxLength(255) originalName!: string }
export class MediaListQueryDto {
  @ApiPropertyOptional({ maxLength: 120, type: String }) @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsOptional() @IsString() @MaxLength(120) keyword?: string
  @ApiPropertyOptional({ enum: MEDIA_TYPES, type: String }) @IsOptional() @IsIn(MEDIA_TYPES) mediaType?: MediaType
  @ApiPropertyOptional({ default: 1, minimum: 1, type: Number }) @Type(() => Number) @IsOptional() @IsInt() @Min(1) page = 1
  @ApiPropertyOptional({ default: 20, maximum: 100, minimum: 1, type: Number }) @Type(() => Number) @IsOptional() @IsInt() @Min(1) @Max(100) pageSize = 20
}
export class MediaParamsDto { @ApiProperty({ format: 'uuid', type: String }) @IsUUID() mediaId!: string }
export class MediaResponseDto { @ApiProperty({ type: String }) id!: string; @ApiProperty({ type: String }) filename!: string; @ApiProperty({ type: String }) originalName!: string; @ApiProperty({ enum: MEDIA_TYPES, type: String }) mediaType!: MediaType; @ApiProperty({ type: String }) mimeType!: string; @ApiProperty({ type: String }) size!: string; @ApiProperty({ type: String }) bucket!: string; @ApiProperty({ type: String }) objectKey!: string; @ApiProperty({ type: String }) url!: string; @ApiProperty({ type: String }) createdAt!: string }
export class MediaListResponseDto { @ApiProperty({ isArray: true, type: MediaResponseDto }) items!: MediaResponseDto[]; @ApiProperty({ type: Number }) page!: number; @ApiProperty({ type: Number }) pageSize!: number; @ApiProperty({ type: Number }) total!: number; @ApiProperty({ type: Number }) totalPages!: number }
export class MediaUploadUrlResponseDto { @ApiProperty({ type: String }) uploadUrl!: string; @ApiProperty({ type: String }) key!: string; @ApiProperty({ type: String }) contentType!: string; @ApiProperty({ type: Number }) expiresInSeconds!: number }
export class MediaDownloadUrlResponseDto { @ApiProperty({ type: String }) url!: string }
