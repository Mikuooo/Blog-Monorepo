import { Inject, Injectable } from '@nestjs/common'

import {
  TAXONOMY_REPOSITORY,
  type CategoryListItem,
  type CreateCategoryCommand,
  type CreateTagCommand,
  type TagListItem,
  type TaxonomyDeleteResult,
  type TaxonomyListQuery,
  type TaxonomyListResult,
  type TaxonomyRepository,
  type UpdateCategoryCommand,
  type UpdateTagCommand,
} from './taxonomy.contract.js'

@Injectable()
export class TaxonomyService {
  constructor(@Inject(TAXONOMY_REPOSITORY) private readonly repository: TaxonomyRepository) {}

  createCategory(command: CreateCategoryCommand): Promise<CategoryListItem> {
    return this.repository.createCategory(command)
  }

  createTag(command: CreateTagCommand): Promise<TagListItem> {
    return this.repository.createTag(command)
  }

  deleteCategory(categoryId: string, actorId: string): Promise<TaxonomyDeleteResult> {
    return this.repository.deleteCategory(categoryId, actorId)
  }

  deleteTag(tagId: string, actorId: string): Promise<TaxonomyDeleteResult> {
    return this.repository.deleteTag(tagId, actorId)
  }

  listCategories(query: TaxonomyListQuery): Promise<TaxonomyListResult<CategoryListItem>> {
    return this.repository.listCategories(query)
  }

  listTags(query: TaxonomyListQuery): Promise<TaxonomyListResult<TagListItem>> {
    return this.repository.listTags(query)
  }

  updateCategory(command: UpdateCategoryCommand): Promise<CategoryListItem> {
    return this.repository.updateCategory(command)
  }

  updateTag(command: UpdateTagCommand): Promise<TagListItem> {
    return this.repository.updateTag(command)
  }
}
