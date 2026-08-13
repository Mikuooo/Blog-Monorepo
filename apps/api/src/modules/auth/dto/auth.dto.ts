import { Transform } from 'class-transformer'
import { IsString, Length } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LoginRequestDto {
  @ApiProperty({ example: 'admin@blog.local', maxLength: 320, minLength: 3, type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 320)
  identifier!: string

  @ApiProperty({ format: 'password', maxLength: 128, minLength: 1, type: String })
  @IsString()
  @Length(1, 128)
  password!: string
}

export class AuthUserDto {
  @ApiProperty({ type: String })
  displayName!: string

  @ApiProperty({ format: 'email', type: String })
  email!: string

  @ApiProperty({ format: 'uuid', type: String })
  id!: string

  @ApiProperty({ isArray: true, type: String })
  permissions!: string[]

  @ApiProperty({ isArray: true, type: String })
  roles!: string[]

  @ApiProperty({ type: String })
  username!: string
}

export class LoginResponseDto {
  @ApiProperty({ format: 'date-time', type: String })
  expiresAt!: string

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto
}

export class AuthErrorResponseDto {
  @ApiProperty({ example: 'INVALID_CREDENTIALS', type: String })
  code!: string

  @ApiProperty({ example: 'The supplied credentials are invalid.', type: String })
  message!: string

  @ApiProperty({ example: 401, type: Number })
  statusCode!: number
}
