import { Module } from '@nestjs/common'
import { PrismaInfrastructureModule } from '../../infrastructure/prisma/prisma-infrastructure.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { DashboardController } from './dashboard.controller.js'
import { DashboardService } from './dashboard.service.js'
@Module({ imports: [AuthModule, PrismaInfrastructureModule], controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}
