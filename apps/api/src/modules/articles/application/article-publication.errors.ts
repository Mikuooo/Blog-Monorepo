export class ArticlePublicationError extends Error {
  constructor(
    readonly code:
      | 'ARTICLE_NOT_FOUND'
      | 'IDEMPOTENCY_CONFLICT'
      | 'IDEMPOTENCY_IN_PROGRESS'
      | 'PUBLICATION_CONFLICT',
  ) {
    super(code)
    this.name = 'ArticlePublicationError'
  }
}
