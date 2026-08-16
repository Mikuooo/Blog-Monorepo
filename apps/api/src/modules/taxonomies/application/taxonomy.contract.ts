export type TaxonomyListQuery = {
  keyword?: string
  page: number
  pageSize: number
}

export type CategoryListItem = {
  articleCount: number
  childCount: number
  createdAt: string
  description: string | null
  id: string
  name: string
  parent: { id: string; name: string } | null
  slug: string
  sortOrder: number
  updatedAt: string
}

export type TagListItem = {
  articleCount: number
  createdAt: string
  description: string | null
  id: string
  name: string
  slug: string
  updatedAt: string
}

export type TaxonomyListResult<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type CreateCategoryCommand = {
  actorId: string
  description?: string
  name: string
  parentId?: string
  slug: string
  sortOrder?: number
}

export type UpdateCategoryCommand = {
  actorId: string
  categoryId: string
  description?: string
  name?: string
  parentId?: string | null
  slug?: string
  sortOrder?: number
}

export type CreateTagCommand = {
  actorId: string
  description?: string
  name: string
  slug: string
}

export type UpdateTagCommand = Partial<Omit<CreateTagCommand, 'actorId'>> & {
  actorId: string
  tagId: string
}

export type TaxonomyDeleteResult = { articleCount: number; id: string }

export const TAXONOMY_REPOSITORY = Symbol('TAXONOMY_REPOSITORY')

export interface TaxonomyRepository {
  createCategory(command: CreateCategoryCommand): Promise<CategoryListItem>
  createTag(command: CreateTagCommand): Promise<TagListItem>
  deleteCategory(categoryId: string, actorId: string): Promise<TaxonomyDeleteResult>
  deleteTag(tagId: string, actorId: string): Promise<TaxonomyDeleteResult>
  listCategories(query: TaxonomyListQuery): Promise<TaxonomyListResult<CategoryListItem>>
  listTags(query: TaxonomyListQuery): Promise<TaxonomyListResult<TagListItem>>
  updateCategory(command: UpdateCategoryCommand): Promise<CategoryListItem>
  updateTag(command: UpdateTagCommand): Promise<TagListItem>
}
