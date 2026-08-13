import { Module } from '@nestjs/common'

import { PrismaInfrastructureModule } from '../../infrastructure/prisma/prisma-infrastructure.module.js'
import { ARTICLE_PUBLICATION_UNIT_OF_WORK } from './application/article-publication.contract.js'
import { ArticlesService } from './application/articles.service.js'
import { PrismaArticlePublicationUnitOfWork } from './infrastructure/persistence/prisma-article-publication.unit-of-work.js'

@Module({
  exports: [ArticlesService],
  imports: [PrismaInfrastructureModule],
  providers: [
    ArticlesService,
    {
      provide: ARTICLE_PUBLICATION_UNIT_OF_WORK,
      useClass: PrismaArticlePublicationUnitOfWork,
    },
  ],
})
export class ArticlesModule {}
