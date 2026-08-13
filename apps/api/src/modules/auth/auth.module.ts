import { Module } from '@nestjs/common'

import { PrismaInfrastructureModule } from '../../infrastructure/prisma/prisma-infrastructure.module.js'
import { AUTH_REPOSITORY } from './application/auth.contract.js'
import { AuthService } from './application/auth.service.js'
import { AuthController } from './controllers/auth.controller.js'
import { PermissionGuard } from './guards/permission.guard.js'
import { SessionAuthGuard } from './guards/session-auth.guard.js'
import { TrustedOriginGuard } from './guards/trusted-origin.guard.js'
import { PrismaAuthRepository } from './infrastructure/prisma-auth.repository.js'

@Module({
  controllers: [AuthController],
  exports: [AuthService, PermissionGuard, SessionAuthGuard, TrustedOriginGuard],
  imports: [PrismaInfrastructureModule],
  providers: [
    AuthService,
    PermissionGuard,
    SessionAuthGuard,
    TrustedOriginGuard,
    { provide: AUTH_REPOSITORY, useClass: PrismaAuthRepository },
  ],
})
export class AuthModule {}
