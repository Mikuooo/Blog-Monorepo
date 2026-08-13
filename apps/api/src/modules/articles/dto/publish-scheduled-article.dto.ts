import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsUUID, Min } from 'class-validator'

export class PublishScheduledArticleRequestDto {
  @ApiProperty({ enum: [1], example: 1, type: Number })
  @Type(() => Number)
  @IsInt()
  contractVersion!: 1

  @ApiProperty({ example: 7, minimum: 1, type: Number })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  scheduleVersion!: number
}

export class PublishScheduledArticleParamsDto {
  @ApiProperty({ format: 'uuid', type: String })
  @IsUUID()
  articleId!: string
}

export class PublishScheduledArticleResponseDto {
  @ApiProperty({ format: 'uuid', type: String })
  articleId!: string

  @ApiProperty({ enum: ['PUBLISHED', 'ALREADY_APPLIED', 'STALE', 'NOT_DUE'], type: String })
  outcome!: 'PUBLISHED' | 'ALREADY_APPLIED' | 'STALE' | 'NOT_DUE'

  @ApiProperty({ format: 'date-time', required: false, type: String })
  publishedAt?: string

  @ApiProperty({ format: 'date-time', required: false, type: String })
  retryAt?: string

  @ApiProperty({ format: 'uuid', required: false, type: String })
  revisionId?: string
}

export class InternalCommandErrorResponseDto {
  @ApiProperty({ example: 'ARTICLE_NOT_FOUND', type: String })
  code!: string

  @ApiProperty({
    example: 'The scheduled publication command could not be completed.',
    type: String,
  })
  message!: string

  @ApiProperty({ example: 404, type: Number })
  statusCode!: number
}
