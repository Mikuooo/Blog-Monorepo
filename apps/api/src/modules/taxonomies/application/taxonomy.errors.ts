export type TaxonomyErrorCode =
  | 'CATEGORY_HAS_CHILDREN'
  | 'CATEGORY_NOT_FOUND'
  | 'CATEGORY_PARENT_CYCLE'
  | 'CATEGORY_PARENT_NOT_FOUND'
  | 'CATEGORY_SLUG_EXISTS'
  | 'TAG_NAME_EXISTS'
  | 'TAG_NOT_FOUND'
  | 'TAG_SLUG_EXISTS'

export class TaxonomyError extends Error {
  constructor(readonly code: TaxonomyErrorCode) {
    super(code)
    this.name = 'TaxonomyError'
  }
}
