import { ApiProperty } from '@nestjs/swagger'

export class HealthResponseDto {
  @ApiProperty({ enum: ['api'], example: 'api', type: String })
  service: string = 'api'

  @ApiProperty({ enum: ['ok'], example: 'ok', type: String })
  status: string = 'ok'
}
