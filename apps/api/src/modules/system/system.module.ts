import { Module } from '@nestjs/common'

import { HealthController } from './controllers/health.controller.js'
import { SystemService } from './system.service.js'

@Module({
  controllers: [HealthController],
  providers: [SystemService],
})
export class SystemModule {}
