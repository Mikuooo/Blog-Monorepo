export class ArticleQueryError extends Error {
  constructor(readonly code: 'ARTICLE_NOT_FOUND') {
    super(code)
    this.name = 'ArticleQueryError'
  }
}
