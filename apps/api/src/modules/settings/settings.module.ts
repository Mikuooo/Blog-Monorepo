import { Module } from '@nestjs/common'

import { PrismaInfrastructureModule } from '../../infrastructure/prisma/prisma-infrastructure.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { SETTINGS_REPOSITORY } from './application/settings.contract.js'
import { SettingsService } from './application/settings.service.js'
import { AdminSettingsController } from './controllers/admin-settings.controller.js'
import { PrismaSettingsRepository } from './infrastructure/persistence/prisma-settings.repository.js'

@Module({
  controllers: [AdminSettingsController],
  imports: [AuthModule, PrismaInfrastructureModule],
  providers: [
    SettingsService,
    { provide: SETTINGS_REPOSITORY, useClass: PrismaSettingsRepository },
  ],
})
export class SettingsModule {}
