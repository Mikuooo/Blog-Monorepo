import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

const ROLE_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/u
const USER_STATUSES = ['ACTIVE', 'DISABLED'] as const

export class AccessControlListQueryDto {
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
}

export class UserListQueryDto extends AccessControlListQueryDto {
  @ApiProperty({ enum: USER_STATUSES, required: false, type: String })
  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: (typeof USER_STATUSES)[number]
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: USER_STATUSES, type: String })
  @IsIn(USER_STATUSES)
  status!: (typeof USER_STATUSES)[number]
}

export class UpdateUserRolesDto {
  @ApiProperty({ format: 'uuid', isArray: true, maxItems: 50, type: String })
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  roleIds!: string[]
}

export class CreateRoleDto {
  @ApiProperty({ maxLength: 80, pattern: ROLE_CODE_PATTERN.source, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(ROLE_CODE_PATTERN)
  code!: string

  @ApiProperty({ maxLength: 500, required: false, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @ApiProperty({ maxLength: 120, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string

  @ApiProperty({ format: 'uuid', isArray: true, maxItems: 200, type: String })
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  permissionIds!: string[]
}

export class UpdateRoleDto {
  @ApiProperty({ maxLength: 500, required: false, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @ApiProperty({ maxLength: 120, required: false, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string

  @ApiProperty({ format: 'uuid', isArray: true, maxItems: 200, required: false, type: String })
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  permissionIds?: string[]
}

export class RoleSummaryDto {
  @ApiProperty({ type: String })
  code!: string

  @ApiProperty({ format: 'uuid', type: String })
  id!: string

  @ApiProperty({ type: String })
  name!: string
}

export class PermissionSummaryDto {
  @ApiProperty({ type: String })
  code!: string

  @ApiProperty({ nullable: true, type: String })
  description!: string | null

  @ApiProperty({ format: 'uuid', type: String })
  id!: string
}

export class AdminUserListItemDto {
  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: string

  @ApiProperty({ type: String })
  displayName!: string

  @ApiProperty({ type: String })
  email!: string

  @ApiProperty({ format: 'uuid', type: String })
  id!: string

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  lastLoginAt!: string | null

  @ApiProperty({ isArray: true, type: RoleSummaryDto })
  roles!: RoleSummaryDto[]

  @ApiProperty({ enum: USER_STATUSES, type: String })
  status!: (typeof USER_STATUSES)[number]

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: string

  @ApiProperty({ type: String })
  username!: string
}

export class AdminRoleListItemDto {
  @ApiProperty({ type: String })
  code!: string

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: string

  @ApiProperty({ nullable: true, type: String })
  description!: string | null

  @ApiProperty({ format: 'uuid', type: String })
  id!: string

  @ApiProperty({ type: Boolean })
  isSystem!: boolean

  @ApiProperty({ type: String })
  name!: string

  @ApiProperty({ isArray: true, type: PermissionSummaryDto })
  permissions!: PermissionSummaryDto[]

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: string

  @ApiProperty({ type: Number })
  userCount!: number
}

export class AdminUserListResponseDto {
  @ApiProperty({ isArray: true, type: AdminUserListItemDto })
  items!: AdminUserListItemDto[]

  @ApiProperty({ type: Number })
  page!: number

  @ApiProperty({ type: Number })
  pageSize!: number

  @ApiProperty({ type: Number })
  total!: number

  @ApiProperty({ type: Number })
  totalPages!: number
}

export class AdminRoleListResponseDto {
  @ApiProperty({ isArray: true, type: AdminRoleListItemDto })
  items!: AdminRoleListItemDto[]

  @ApiProperty({ type: Number })
  page!: number

  @ApiProperty({ type: Number })
  pageSize!: number

  @ApiProperty({ type: Number })
  total!: number

  @ApiProperty({ type: Number })
  totalPages!: number
}

export class DeleteRoleResponseDto {
  @ApiProperty({ format: 'uuid', type: String })
  id!: string
}

export class AccessControlErrorResponseDto {
  @ApiProperty({ example: 'USER_NOT_FOUND', type: String })
  code!: string

  @ApiProperty({ example: 'The requested user was not found.', type: String })
  message!: string

  @ApiProperty({ example: 404, type: Number })
  statusCode!: number
}
