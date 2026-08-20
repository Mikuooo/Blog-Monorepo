import { Inject, Injectable } from '@nestjs/common'

import type { DatabaseClient } from '@blog/database'

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js'
import type {
  CategoryListItem,
  CreateCategoryCommand,
  CreateTagCommand,
  TagListItem,
  PublicTaxonomyItem,
  TaxonomyDeleteResult,
  TaxonomyListQuery,
  TaxonomyListResult,
  TaxonomyRepository,
  UpdateCategoryCommand,
  UpdateTagCommand,
} from '../../application/taxonomy.contract.js'
import { TaxonomyError } from '../../application/taxonomy.errors.js'

type TransactionClient = Parameters<Parameters<DatabaseClient['$transaction']>[0]>[0]

@Injectable()
export class PrismaTaxonomyRepository implements TaxonomyRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listCategories(query: TaxonomyListQuery): Promise<TaxonomyListResult<CategoryListItem>> {
    const keyword = query.keyword?.trim()
    const where = {
      deletedAt: null,
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: 'insensitive' as const } },
              { slug: { contains: keyword, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
    const [items, total] = await Promise.all([
      this.prisma.client.category.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
        select: categorySelect,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
      this.prisma.client.category.count({ where }),
    ])
    return pageResult(items.map(mapCategory), query, total)
  }

  async listTags(query: TaxonomyListQuery): Promise<TaxonomyListResult<TagListItem>> {
    const keyword = query.keyword?.trim()
    const where = keyword
      ? {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' as const } },
            { slug: { contains: keyword, mode: 'insensitive' as const } },
          ],
        }
      : {}
    const [items, total] = await Promise.all([
      this.prisma.client.tag.findMany({
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: tagSelect,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
      this.prisma.client.tag.count({ where }),
    ])
    return pageResult(items.map(mapTag), query, total)
  }

  async listPublicCategories(): Promise<PublicTaxonomyItem[]> {
    const items = await this.prisma.client.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { _count: { select: { articles: { where: publicArticleWhere } } }, description: true, id: true, name: true, slug: true },
      where: { articles: { some: publicArticleWhere }, deletedAt: null },
    })
    return items.map(({ _count, ...item }) => ({ ...item, articleCount: _count.articles }))
  }

  async listPublicTags(): Promise<PublicTaxonomyItem[]> {
    const items = await this.prisma.client.tag.findMany({
      orderBy: [{ name: 'asc' }],
      select: { _count: { select: { articles: { where: { article: publicArticleWhere } } } }, description: true, id: true, name: true, slug: true },
      where: { articles: { some: { article: publicArticleWhere } } },
    })
    return items.map(({ _count, ...item }) => ({ ...item, articleCount: _count.articles }))
  }

  async createCategory(command: CreateCategoryCommand): Promise<CategoryListItem> {
    try {
      return await this.prisma.client.$transaction(async (transaction) => {
        if (command.parentId) await requireCategory(transaction, command.parentId, true)
        const lastSibling = await transaction.category.aggregate({
          _max: { sortOrder: true },
          where: { deletedAt: null, parentId: command.parentId ?? null },
        })
        const category = await transaction.category.create({
          data: {
            description: emptyToNull(command.description),
            name: command.name,
            parentId: command.parentId ?? null,
            slug: command.slug,
            sortOrder: (lastSibling._max.sortOrder ?? -1) + 1,
          },
          select: categorySelect,
        })
        await writeAudit(transaction, command.actorId, 'category.create', category.id)
        return mapCategory(category)
      })
    } catch (error) {
      if (error instanceof TaxonomyError) throw error
      if (isUniqueViolation(error)) throw new TaxonomyError('CATEGORY_SLUG_EXISTS')
      throw error
    }
  }

  async updateCategory(command: UpdateCategoryCommand): Promise<CategoryListItem> {
    try {
      return await this.prisma.client.$transaction(async (transaction) => {
        await requireCategory(transaction, command.categoryId)
        if (command.parentId === command.categoryId)
          throw new TaxonomyError('CATEGORY_PARENT_CYCLE')
        if (command.parentId)
          await ensureParentDoesNotCycle(transaction, command.categoryId, command.parentId)
        const category = await transaction.category.update({
          data: {
            ...(command.description === undefined
              ? {}
              : { description: emptyToNull(command.description) }),
            ...(command.name === undefined ? {} : { name: command.name }),
            ...(command.parentId === undefined ? {} : { parentId: command.parentId }),
            ...(command.slug === undefined ? {} : { slug: command.slug }),
            ...(command.sortOrder === undefined ? {} : { sortOrder: command.sortOrder }),
          },
          select: categorySelect,
          where: { id: command.categoryId },
        })
        await writeAudit(transaction, command.actorId, 'category.update', category.id)
        return mapCategory(category)
      })
    } catch (error) {
      if (error instanceof TaxonomyError) throw error
      if (isUniqueViolation(error)) throw new TaxonomyError('CATEGORY_SLUG_EXISTS')
      throw error
    }
  }

  async deleteCategory(categoryId: string, actorId: string): Promise<TaxonomyDeleteResult> {
    return this.prisma.client.$transaction(async (transaction) => {
      const category = await requireCategory(transaction, categoryId)
      if (category._count.children > 0) throw new TaxonomyError('CATEGORY_HAS_CHILDREN')
      await transaction.category.update({
        data: { deletedAt: new Date() },
        where: { id: categoryId },
      })
      await writeAudit(transaction, actorId, 'category.delete', categoryId)
      return { articleCount: category._count.articles, id: categoryId }
    })
  }

  async createTag(command: CreateTagCommand): Promise<TagListItem> {
    try {
      return await this.prisma.client.$transaction(async (transaction) => {
        await ensureTagUnique(transaction, command.name, command.slug)
        const tag = await transaction.tag.create({
          data: {
            description: emptyToNull(command.description),
            name: command.name,
            slug: command.slug,
          },
          select: tagSelect,
        })
        await writeAudit(transaction, command.actorId, 'tag.create', tag.id)
        return mapTag(tag)
      })
    } catch (error) {
      if (error instanceof TaxonomyError) throw error
      if (isUniqueViolation(error)) throw new TaxonomyError('TAG_SLUG_EXISTS')
      throw error
    }
  }

  async updateTag(command: UpdateTagCommand): Promise<TagListItem> {
    try {
      return await this.prisma.client.$transaction(async (transaction) => {
        const current = await transaction.tag.findUnique({ where: { id: command.tagId } })
        if (!current) throw new TaxonomyError('TAG_NOT_FOUND')
        await ensureTagUnique(
          transaction,
          command.name ?? current.name,
          command.slug ?? current.slug,
          command.tagId,
        )
        const tag = await transaction.tag.update({
          data: {
            ...(command.description === undefined
              ? {}
              : { description: emptyToNull(command.description) }),
            ...(command.name === undefined ? {} : { name: command.name }),
            ...(command.slug === undefined ? {} : { slug: command.slug }),
          },
          select: tagSelect,
          where: { id: command.tagId },
        })
        await writeAudit(transaction, command.actorId, 'tag.update', tag.id)
        return mapTag(tag)
      })
    } catch (error) {
      if (error instanceof TaxonomyError) throw error
      if (isUniqueViolation(error)) throw new TaxonomyError('TAG_SLUG_EXISTS')
      throw error
    }
  }

  async deleteTag(tagId: string, actorId: string): Promise<TaxonomyDeleteResult> {
    return this.prisma.client.$transaction(async (transaction) => {
      const tag = await transaction.tag.findUnique({
        select: { _count: { select: { articles: true } }, id: true },
        where: { id: tagId },
      })
      if (!tag) throw new TaxonomyError('TAG_NOT_FOUND')
      await transaction.tag.delete({ where: { id: tagId } })
      await writeAudit(transaction, actorId, 'tag.delete', tagId)
      return { articleCount: tag._count.articles, id: tagId }
    })
  }
}

const publicArticleWhere = { deletedAt: null, publishedAt: { lte: new Date() }, status: 'PUBLISHED' as const, visibility: 'PUBLIC' as const }

const categorySelect = {
  _count: {
    select: {
      articles: { where: { deletedAt: null } },
      children: { where: { deletedAt: null } },
    },
  },
  createdAt: true,
  description: true,
  id: true,
  name: true,
  parent: { select: { id: true, name: true } },
  slug: true,
  sortOrder: true,
  updatedAt: true,
} as const

const tagSelect = {
  _count: { select: { articles: true } },
  createdAt: true,
  description: true,
  id: true,
  name: true,
  slug: true,
  updatedAt: true,
} as const

function mapCategory(category: {
  _count: { articles: number; children: number }
  createdAt: Date
  description: string | null
  id: string
  name: string
  parent: { id: string; name: string } | null
  slug: string
  sortOrder: number
  updatedAt: Date
}): CategoryListItem {
  return {
    articleCount: category._count.articles,
    childCount: category._count.children,
    createdAt: category.createdAt.toISOString(),
    description: category.description,
    id: category.id,
    name: category.name,
    parent: category.parent,
    slug: category.slug,
    sortOrder: category.sortOrder,
    updatedAt: category.updatedAt.toISOString(),
  }
}

function mapTag(tag: {
  _count: { articles: number }
  createdAt: Date
  description: string | null
  id: string
  name: string
  slug: string
  updatedAt: Date
}): TagListItem {
  return {
    articleCount: tag._count.articles,
    createdAt: tag.createdAt.toISOString(),
    description: tag.description,
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    updatedAt: tag.updatedAt.toISOString(),
  }
}

function pageResult<T>(items: T[], query: TaxonomyListQuery, total: number): TaxonomyListResult<T> {
  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
  }
}

async function requireCategory(
  transaction: TransactionClient,
  categoryId: string,
  asParent = false,
) {
  const category = await transaction.category.findFirst({
    select: {
      _count: {
        select: {
          articles: { where: { deletedAt: null } },
          children: { where: { deletedAt: null } },
        },
      },
      id: true,
      parentId: true,
    },
    where: { deletedAt: null, id: categoryId },
  })
  if (!category) {
    throw new TaxonomyError(asParent ? 'CATEGORY_PARENT_NOT_FOUND' : 'CATEGORY_NOT_FOUND')
  }
  return category
}

async function ensureParentDoesNotCycle(
  transaction: TransactionClient,
  categoryId: string,
  parentId: string,
): Promise<void> {
  let currentId: string | null = parentId
  const visited = new Set<string>()
  while (currentId) {
    if (currentId === categoryId || visited.has(currentId)) {
      throw new TaxonomyError('CATEGORY_PARENT_CYCLE')
    }
    visited.add(currentId)
    const category = await requireCategory(transaction, currentId, true)
    currentId = category.parentId
  }
}

async function ensureTagUnique(
  transaction: TransactionClient,
  name: string,
  slug: string,
  excludeId?: string,
): Promise<void> {
  const existing = await transaction.tag.findFirst({
    select: { name: true, slug: true },
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [{ name }, { slug }],
    },
  })
  if (!existing) return
  throw new TaxonomyError(existing.name === name ? 'TAG_NAME_EXISTS' : 'TAG_SLUG_EXISTS')
}

function emptyToNull(value: string | undefined): string | null {
  return value?.trim() || null
}

async function writeAudit(
  transaction: TransactionClient,
  actorId: string,
  action: string,
  resourceId: string,
): Promise<void> {
  await transaction.auditLog.create({
    data: { action, resource: 'taxonomy', resourceId, userId: actorId },
  })
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
}
