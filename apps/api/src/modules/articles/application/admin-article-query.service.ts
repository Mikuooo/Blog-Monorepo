import { Inject, Injectable } from '@nestjs/common'

import {
  ARTICLE_QUERY_REPOSITORY,
  type AdminArticleDetail,
  type AdminArticleListQuery,
  type AdminArticleListResult,
  type ArticleQueryRepository,
} from './article-query.contract.js'
import { ArticleQueryError } from './article-query.errors.js'

@Injectable()
export class AdminArticleQueryService {
  constructor(
    @Inject(ARTICLE_QUERY_REPOSITORY)
    private readonly repository: ArticleQueryRepository,
  ) {}

  list(query: AdminArticleListQuery): Promise<AdminArticleListResult> {
    return this.repository.findAdminArticles(query)
  }

  async getById(articleId: string): Promise<AdminArticleDetail> {
    const article = await this.repository.findAdminArticleById(articleId)
    if (!article) throw new ArticleQueryError('ARTICLE_NOT_FOUND')
    return article
  }
}
