import { Module } from '@nestjs/common'

import { PrismaInfrastructureModule } from '../../infrastructure/prisma/prisma-infrastructure.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { TAXONOMY_REPOSITORY } from './application/taxonomy.contract.js'
import { TaxonomyService } from './application/taxonomy.service.js'
import { AdminCategoriesController } from './controllers/admin-categories.controller.js'
import { AdminTagsController } from './controllers/admin-tags.controller.js'
import { PrismaTaxonomyRepository } from './infrastructure/persistence/prisma-taxonomy.repository.js'

@Module({
  controllers: [AdminCategoriesController, AdminTagsController],
  imports: [AuthModule, PrismaInfrastructureModule],
  providers: [
    TaxonomyService,
    { provide: TAXONOMY_REPOSITORY, useClass: PrismaTaxonomyRepository },
  ],
})
export class TaxonomiesModule {}
