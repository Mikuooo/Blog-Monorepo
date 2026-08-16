import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

const ARTICLE_STATUSES = ['DRAFT', 'PUBLISHED'] as const

export class BasicSettingsDto {
  @ApiProperty({ maxLength: 2048, type: String })
  @Transform(trimString)
  @ValidateIf((_object, value: unknown) => value !== '')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  @MaxLength(2048)
  faviconUrl!: string

  @ApiProperty({ maxLength: 2048, type: String })
  @Transform(trimString)
  @ValidateIf((_object, value: unknown) => value !== '')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  @MaxLength(2048)
  logoUrl!: string

  @ApiProperty({ maxLength: 500, type: String })
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  siteDescription!: string

  @ApiProperty({ maxLength: 160, minLength: 1, type: String })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  siteName!: string

  @ApiProperty({ maxLength: 2048, type: String })
  @Transform(trimString)
  @ValidateIf((_object, value: unknown) => value !== '')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  @MaxLength(2048)
  siteUrl!: string
}

export class SeoSettingsDto {
  @ApiProperty({ maxLength: 500, type: String })
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  defaultDescription!: string

  @ApiProperty({ maxLength: 240, type: String })
  @Transform(trimString)
  @IsString()
  @MaxLength(240)
  defaultTitle!: string

  @ApiProperty({ isArray: true, maxItems: 20, type: String })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value.map((item) => trimUnknownString(item)) : value,
  )
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(80, { each: true })
  keywords!: string[]
}

export class ContentSettingsDto {
  @ApiProperty({ maximum: 100, minimum: 10, type: Number })
  @IsInt()
  @Min(10)
  @Max(100)
  articlesPerPage!: number

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  commentsEnabled!: boolean

  @ApiProperty({ enum: ARTICLE_STATUSES, type: String })
  @IsIn(ARTICLE_STATUSES)
  defaultArticleStatus!: (typeof ARTICLE_STATUSES)[number]
}

export class UpdateSystemSettingsDto {
  @ApiProperty({ type: BasicSettingsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => BasicSettingsDto)
  basic!: BasicSettingsDto

  @ApiProperty({ type: ContentSettingsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ContentSettingsDto)
  content!: ContentSettingsDto

  @ApiProperty({ type: SeoSettingsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => SeoSettingsDto)
  seo!: SeoSettingsDto
}

export class SystemSettingsResponseDto extends UpdateSystemSettingsDto {
  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  updatedAt!: string | null
}

export class SettingsErrorResponseDto {
  @ApiProperty({ example: 'PERMISSION_DENIED', type: String })
  code!: string

  @ApiProperty({ example: 'The required permission was not granted.', type: String })
  message!: string

  @ApiProperty({ example: 403, type: Number })
  statusCode!: number
}

function trimString({ value }: { value: unknown }): unknown {
  return trimUnknownString(value)
}

function trimUnknownString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value
}
