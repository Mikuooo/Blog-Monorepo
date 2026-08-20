import { Module } from '@nestjs/common'
import { PrismaInfrastructureModule } from '../../infrastructure/prisma/prisma-infrastructure.module.js'
import { ContentService } from './content.service.js'
import { ContentController } from './content.controller.js'
@Module({ imports: [PrismaInfrastructureModule], controllers: [ContentController], providers: [ContentService] })
export class ContentModule {}
