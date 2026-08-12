import { Module } from '@nestjs/common'

import { InternalHealthController } from './controllers/internal-health.controller.js'
import { InternalServiceGuard } from './internal-service.guard.js'
import { SystemService } from './system.service.js'

@Module({
  controllers: [InternalHealthController],
  providers: [InternalServiceGuard, SystemService],
})
export class InternalSystemModule {}
