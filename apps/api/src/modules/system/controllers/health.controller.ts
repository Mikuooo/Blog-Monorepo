import { Controller, Get, Inject } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'

import { HealthResponseDto } from '../dto/health-response.dto.js'
import { SystemService } from '../system.service.js'

@ApiTags('system')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(@Inject(SystemService) private readonly systemService: SystemService) {}

  @Get()
  @ApiOperation({ operationId: 'getHealth', summary: 'Check API liveness' })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return this.systemService.getHealth()
  }
}
