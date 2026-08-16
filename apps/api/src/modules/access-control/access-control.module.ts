import { Module } from '@nestjs/common'

import { PrismaInfrastructureModule } from '../../infrastructure/prisma/prisma-infrastructure.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { ACCESS_CONTROL_REPOSITORY } from './application/access-control.contract.js'
import { AccessControlService } from './application/access-control.service.js'
import { AdminRolesController } from './controllers/admin-roles.controller.js'
import { AdminUsersController } from './controllers/admin-users.controller.js'
import { PrismaAccessControlRepository } from './infrastructure/persistence/prisma-access-control.repository.js'

@Module({
  controllers: [AdminUsersController, AdminRolesController],
  imports: [AuthModule, PrismaInfrastructureModule],
  providers: [
    AccessControlService,
    { provide: ACCESS_CONTROL_REPOSITORY, useClass: PrismaAccessControlRepository },
  ],
})
export class AccessControlModule {}
