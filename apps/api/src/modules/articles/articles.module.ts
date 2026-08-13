import { Module } from '@nestjs/common'

import { PrismaInfrastructureModule } from '../../infrastructure/prisma/prisma-infrastructure.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { ARTICLE_PUBLICATION_UNIT_OF_WORK } from './application/article-publication.contract.js'
import { ARTICLE_QUERY_REPOSITORY } from './application/article-query.contract.js'
import { AdminArticleQueryService } from './application/admin-article-query.service.js'
import { ArticlesService } from './application/articles.service.js'
import { AdminArticlesController } from './controllers/admin-articles.controller.js'
import { PrismaArticlePublicationUnitOfWork } from './infrastructure/persistence/prisma-article-publication.unit-of-work.js'
import { PrismaArticleQueryRepository } from './infrastructure/persistence/prisma-article-query.repository.js'

@Module({
  controllers: [AdminArticlesController],
  exports: [AdminArticleQueryService, ArticlesService],
  imports: [AuthModule, PrismaInfrastructureModule],
  providers: [
    AdminArticleQueryService,
    ArticlesService,
    {
      provide: ARTICLE_QUERY_REPOSITORY,
      useClass: PrismaArticleQueryRepository,
    },
    {
      provide: ARTICLE_PUBLICATION_UNIT_OF_WORK,
      useClass: PrismaArticlePublicationUnitOfWork,
    },
  ],
})
export class ArticlesModule {}
