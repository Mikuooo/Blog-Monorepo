import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

import {
  TAXONOMY_REPOSITORY,
  type CategoryListItem,
  type CreateCategoryInput,
  type CreateTagInput,
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

  createCategory(input: CreateCategoryInput): Promise<CategoryListItem> {
    return this.repository.createCategory({
      ...input,
      slug: input.slug?.trim() || generateTaxonomySlug(input.name, 'category'),
    })
  }

  createTag(input: CreateTagInput): Promise<TagListItem> {
    return this.repository.createTag({
      ...input,
      slug: input.slug?.trim() || generateTaxonomySlug(input.name, 'tag'),
    })
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

export function generateTaxonomySlug(name: string, prefix: 'category' | 'tag'): string {
  const normalized = name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 120)
    .replace(/-+$/u, '')
  return normalized || `${prefix}-${randomUUID()}`
}
