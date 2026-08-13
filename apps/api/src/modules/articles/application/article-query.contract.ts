export type ArticleStatus = 'ARCHIVED' | 'DRAFT' | 'PUBLISHED' | 'SCHEDULED'
export type ArticleVisibility = 'PASSWORD' | 'PRIVATE' | 'PUBLIC'

export type ArticleAuthorSummary = {
  displayName: string
  id: string
  username: string
}

export type ArticleCategorySummary = {
  id: string
  name: string
  slug: string
}

export type ArticleTagSummary = {
  id: string
  name: string
  slug: string
}

export type AdminArticleListItem = {
  author: ArticleAuthorSummary
  category: ArticleCategorySummary | null
  commentCount: number
  id: string
  publishedAt: string | null
  scheduledAt: string | null
  slug: string
  status: ArticleStatus
  summary: string | null
  title: string
  updatedAt: string
  viewCount: string
  visibility: ArticleVisibility
}

export type AdminArticleDetail = AdminArticleListItem & {
  allowComment: boolean
  canonicalUrl: string | null
  content: string
  contentHtml: string | null
  cover: {
    height: number | null
    id: string
    mimeType: string
    url: string
    width: number | null
  } | null
  createdAt: string
  isFeatured: boolean
  isPinned: boolean
  likeCount: number
  passwordProtected: boolean
  readingTime: number
  scheduleVersion: number
  seoDescription: string | null
  seoTitle: string | null
  tags: ArticleTagSummary[]
  version: number
  wordCount: number
}

export type AdminArticleListQuery = {
  categoryId?: string
  keyword?: string
  page: number
  pageSize: number
  status?: ArticleStatus
}

export type AdminArticleListResult = {
  items: AdminArticleListItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export const ARTICLE_QUERY_REPOSITORY = Symbol('ARTICLE_QUERY_REPOSITORY')

export interface ArticleQueryRepository {
  findAdminArticleById(articleId: string): Promise<AdminArticleDetail | null>
  findAdminArticles(query: AdminArticleListQuery): Promise<AdminArticleListResult>
}
