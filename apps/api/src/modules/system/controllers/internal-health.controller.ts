import { Controller, Get, Inject, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'

import { HealthResponseDto } from '../dto/health-response.dto.js'
import { InternalServiceGuard } from '../internal-service.guard.js'
import { SystemService } from '../system.service.js'

@ApiTags('internal-system')
@ApiBearerAuth('internal-workload')
@UseGuards(InternalServiceGuard)
@Controller({ path: 'internal/health', version: '1' })
export class InternalHealthController {
  constructor(@Inject(SystemService) private readonly systemService: SystemService) {}

  @Get()
  @ApiOperation({ operationId: 'getInternalHealth', summary: 'Check the private API boundary' })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return this.systemService.getHealth()
  }
}
