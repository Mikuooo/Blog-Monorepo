export type AdminArticleCommandErrorCode =
  | 'ARTICLE_CATEGORY_NOT_FOUND'
  | 'ARTICLE_COVER_NOT_FOUND'
  | 'ARTICLE_INVALID_SCHEDULE_TIME'
  | 'ARTICLE_INVALID_STATE'
  | 'ARTICLE_NOT_FOUND'
  | 'ARTICLE_PASSWORD_MUTATION_CONFLICT'
  | 'ARTICLE_PASSWORD_REQUIRED'
  | 'ARTICLE_SLUG_EXISTS'
  | 'ARTICLE_TAG_NOT_FOUND'
  | 'ARTICLE_VERSION_CONFLICT'

export class AdminArticleCommandError extends Error {
  constructor(readonly code: AdminArticleCommandErrorCode) {
    super(code)
  }
}
