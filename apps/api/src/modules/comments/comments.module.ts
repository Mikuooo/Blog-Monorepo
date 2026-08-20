import { Module } from '@nestjs/common'
import { PrismaInfrastructureModule } from '../../infrastructure/prisma/prisma-infrastructure.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { CommentsService } from './comments.service.js'
import { AdminCommentsController, PublicCommentsController } from './comments.controller.js'
import { COMMENTS_REPOSITORY } from './comments.repository.js'
import { PrismaCommentsRepository } from './prisma-comments.repository.js'
@Module({ imports: [AuthModule, PrismaInfrastructureModule], controllers: [AdminCommentsController, PublicCommentsController], providers: [CommentsService, { provide: COMMENTS_REPOSITORY, useClass: PrismaCommentsRepository }] })
export class CommentsModule {}
