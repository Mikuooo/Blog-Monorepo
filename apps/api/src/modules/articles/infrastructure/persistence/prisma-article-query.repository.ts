import { Inject, Injectable } from '@nestjs/common'

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js'
import type {
  AdminArticleDetail,
  AdminArticleListItem,
  AdminArticleListQuery,
  AdminArticleListResult,
  ArticleQueryRepository,
} from '../../application/article-query.contract.js'

@Injectable()
export class PrismaArticleQueryRepository implements ArticleQueryRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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
