import { Module } from '@nestjs/common'
import { PrismaInfrastructureModule } from '../../infrastructure/prisma/prisma-infrastructure.module.js'
import { StorageInfrastructureModule } from '../../infrastructure/storage/storage-infrastructure.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { MEDIA_REPOSITORY } from './application/media.contract.js'
import { MediaService } from './application/media.service.js'
import { AdminMediaController } from './controllers/admin-media.controller.js'
import { PrismaMediaRepository } from './infrastructure/persistence/prisma-media.repository.js'
@Module({ controllers: [AdminMediaController], imports: [AuthModule, PrismaInfrastructureModule, StorageInfrastructureModule], providers: [MediaService, { provide: MEDIA_REPOSITORY, useClass: PrismaMediaRepository }] })
export class MediaModule {}
