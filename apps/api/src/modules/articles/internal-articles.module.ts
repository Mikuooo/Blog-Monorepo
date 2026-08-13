import { Module } from '@nestjs/common'

import { InternalSystemModule } from '../system/internal-system.module.js'
import { ArticlesModule } from './articles.module.js'
import { InternalArticlesController } from './controllers/internal-articles.controller.js'

@Module({
  controllers: [InternalArticlesController],
  imports: [ArticlesModule, InternalSystemModule],
})
export class InternalArticlesModule {}
