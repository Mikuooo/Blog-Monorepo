import { Injectable } from '@nestjs/common'

import { HealthResponseDto } from './dto/health-response.dto.js'

@Injectable()
export class SystemService {
  getHealth(): HealthResponseDto {
    return new HealthResponseDto()
  }
}
