import { Module } from '@nestjs/common'

import { InternalHealthController } from './controllers/internal-health.controller.js'
import { InternalServiceGuard } from './internal-service.guard.js'
import { InternalWorkloadIdentityVerifier } from './internal-workload-identity.js'
import { SystemService } from './system.service.js'

@Module({
  controllers: [InternalHealthController],
  exports: [InternalServiceGuard, InternalWorkloadIdentityVerifier],
  providers: [InternalServiceGuard, InternalWorkloadIdentityVerifier, SystemService],
})
export class InternalSystemModule {}
