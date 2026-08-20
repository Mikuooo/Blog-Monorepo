import { Inject, Injectable } from '@nestjs/common'

import { ReadonlyPrismaService } from '../../../../infrastructure/prisma/readonly-prisma.service.js'
import type {
  AdminArticleDetail,
  AdminArticleListItem,
  AdminArticleListQuery,
  AdminArticleListResult,
  ArticleQueryRepository,
  PublicArticleDetail,
  PublicArticleListItem,
  PublicArticleListQuery,
  PublicArticleListResult,
} from '../../application/article-query.contract.js'

@Injectable()
export class PrismaArticleQueryRepository implements ArticleQueryRepository {
  constructor(@Inject(ReadonlyPrismaService) private readonly prisma: ReadonlyPrismaService) {}

  async findAdminArticles(query: AdminArticleListQuery): Promise<AdminArticleListResult> {
    const keyword = query.keyword?.trim()
    const where = {
      deletedAt: null,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: 'insensitive' as const } },
              { author: { displayName: { contains: keyword, mode: 'insensitive' as const } } },
              { author: { username: { contains: keyword, mode: 'insensitive' as const } } },
              { category: { name: { contains: keyword, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    }
    const [articles, total] = await Promise.all([
      this.prisma.client.article.findMany({
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        select: listSelect,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
      this.prisma.client.article.count({ where }),
    ])

    return {
      items: articles.map(mapListItem),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
    }
  }

  async findAdminArticleById(articleId: string): Promise<AdminArticleDetail | null> {
    const article = await this.prisma.client.article.findFirst({
      select: {
        ...listSelect,
        allowComment: true,
        canonicalUrl: true,
        content: true,
        contentHtml: true,
        cover: { select: { height: true, id: true, mimeType: true, url: true, width: true } },
        createdAt: true,
        isFeatured: true,
        isPinned: true,
        likeCount: true,
        passwordHash: true,
        readingTime: true,
        scheduleVersion: true,
        seoDescription: true,
        seoTitle: true,
        tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
        version: true,
        wordCount: true,
      },
      where: { deletedAt: null, id: articleId },
    })
    if (!article) return null
    return {
      ...mapListItem(article),
      allowComment: article.allowComment,
      canonicalUrl: article.canonicalUrl,
      content: article.content,
      contentHtml: article.contentHtml,
      cover: article.cover,
      createdAt: article.createdAt.toISOString(),
      isFeatured: article.isFeatured,
      isPinned: article.isPinned,
      likeCount: article.likeCount,
      passwordProtected: Boolean(article.passwordHash),
      readingTime: article.readingTime,
      scheduleVersion: article.scheduleVersion,
      seoDescription: article.seoDescription,
      seoTitle: article.seoTitle,
      tags: article.tags
        .map(({ tag }) => tag)
        .sort((left, right) => left.name.localeCompare(right.name)),
      version: article.version,
      wordCount: article.wordCount,
    }
  }

  async findPublicArticles(query: PublicArticleListQuery): Promise<PublicArticleListResult> {
    const keyword = query.keyword?.trim()
    const where = {
      deletedAt: null,
      publishedAt: { lte: new Date() },
      status: 'PUBLISHED' as const,
      visibility: 'PUBLIC' as const,
      ...(query.categorySlug ? { category: { slug: query.categorySlug } } : {}),
      ...(query.tagSlug ? { tags: { some: { tag: { slug: query.tagSlug } } } } : {}),
      ...(keyword ? { OR: [
        { title: { contains: keyword, mode: 'insensitive' as const } },
        { summary: { contains: keyword, mode: 'insensitive' as const } },
      ] } : {}),
    }
    const [articles, total] = await Promise.all([
      this.prisma.client.article.findMany({ orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }], select: publicListSelect, skip: (query.page - 1) * query.pageSize, take: query.pageSize, where }),
      this.prisma.client.article.count({ where }),
    ])
    return { items: articles.map(mapPublicListItem), page: query.page, pageSize: query.pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize) }
  }

  async findPublicArticleBySlug(slug: string): Promise<PublicArticleDetail | null> {
    const article = await this.prisma.client.article.findFirst({
      select: { ...publicListSelect, allowComment: true, canonicalUrl: true, content: true, contentHtml: true, seoDescription: true, seoTitle: true, updatedAt: true, wordCount: true },
      where: { deletedAt: null, publishedAt: { lte: new Date() }, slug, status: 'PUBLISHED', visibility: 'PUBLIC' },
    })
    if (!article) return null
    return { ...mapPublicListItem(article), allowComment: article.allowComment, canonicalUrl: article.canonicalUrl, content: article.content, contentHtml: article.contentHtml, seoDescription: article.seoDescription, seoTitle: article.seoTitle, updatedAt: article.updatedAt.toISOString(), wordCount: article.wordCount }
  }
}

const listSelect = {
  author: { select: { displayName: true, id: true, username: true } },
  category: { select: { id: true, name: true, slug: true } },
  commentCount: true,
  id: true,
  publishedAt: true,
  scheduledAt: true,
  slug: true,
  status: true,
  summary: true,
  title: true,
  updatedAt: true,
  viewCount: true,
  visibility: true,
} as const

const publicListSelect = {
  author: { select: { displayName: true, username: true } }, category: { select: { id: true, name: true, slug: true } }, cover: { select: { height: true, url: true, width: true } }, id: true, isFeatured: true, isPinned: true, publishedAt: true, readingTime: true, slug: true, summary: true, tags: { select: { tag: { select: { id: true, name: true, slug: true } } } }, title: true,
} as const

type ListRow = {
  author: { displayName: string; id: string; username: string }
  category: { id: string; name: string; slug: string } | null
  commentCount: number
  id: string
  publishedAt: Date | null
  scheduledAt: Date | null
  slug: string
  status: AdminArticleListItem['status']
  summary: string | null
  title: string
  updatedAt: Date
  viewCount: bigint
  visibility: AdminArticleListItem['visibility']
}

function mapListItem(article: ListRow): AdminArticleListItem {
  return {
    author: article.author,
    category: article.category,
    commentCount: article.commentCount,
    id: article.id,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    scheduledAt: article.scheduledAt?.toISOString() ?? null,
    slug: article.slug,
    status: article.status,
    summary: article.summary,
    title: article.title,
    updatedAt: article.updatedAt.toISOString(),
    viewCount: article.viewCount.toString(),
    visibility: article.visibility,
  }
}

function mapPublicListItem(article: { author: { displayName: string; username: string }; category: { id: string; name: string; slug: string } | null; cover: { height: number | null; url: string; width: number | null } | null; id: string; isFeatured: boolean; isPinned: boolean; publishedAt: Date | null; readingTime: number; slug: string; summary: string | null; tags: Array<{ tag: { id: string; name: string; slug: string } }>; title: string }): PublicArticleListItem {
  if (!article.publishedAt) throw new Error('Published article is missing publishedAt')
  return { author: article.author, category: article.category, cover: article.cover, id: article.id, isFeatured: article.isFeatured, isPinned: article.isPinned, publishedAt: article.publishedAt.toISOString(), readingTime: article.readingTime, slug: article.slug, summary: article.summary, tags: article.tags.map(({ tag }) => tag).sort((left, right) => left.name.localeCompare(right.name)), title: article.title }
}
