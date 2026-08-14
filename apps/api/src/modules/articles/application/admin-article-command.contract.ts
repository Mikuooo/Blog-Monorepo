export type ArticleCommandStatus = 'ARCHIVED' | 'DRAFT' | 'PUBLISHED' | 'SCHEDULED'
export type ArticleCommandVisibility = 'PASSWORD' | 'PRIVATE' | 'PUBLIC'

export type ArticleEditableInput = {
  allowComment?: boolean
  canonicalUrl?: string | null
  categoryId?: string | null
  content?: string
  coverId?: string | null
  isFeatured?: boolean
  isPinned?: boolean
  seoDescription?: string | null
  seoTitle?: string | null
  slug?: string
  summary?: string | null
  tagIds?: string[]
  title?: string
  visibility?: ArticleCommandVisibility
}

export type PasswordMutation = {
  clearPassword?: boolean
  passwordHash?: string
}

export type CreateAdminArticleCommand = ArticleEditableInput &
  PasswordMutation & {
    actorId: string
    content: string
    slug: string
    title: string
  }

export type UpdateAdminArticleCommand = ArticleEditableInput &
  PasswordMutation & {
    actorId: string
    articleId: string
    expectedVersion: number
  }

export type ArticleVersionCommand = {
  actorId: string
  articleId: string
  expectedVersion: number
}

export type ScheduleAdminArticleCommand = ArticleVersionCommand & {
  scheduledAt: Date
}

export type AdminArticleCommandResult = {
  articleId: string
  passwordProtected: boolean
  publishedAt: string | null
  revisionId?: string
  scheduledAt: string | null
  scheduleVersion: number
  status: ArticleCommandStatus
  version: number
}

export const ADMIN_ARTICLE_COMMAND_REPOSITORY = Symbol('ADMIN_ARTICLE_COMMAND_REPOSITORY')

export interface AdminArticleCommandRepository {
  archive(command: ArticleVersionCommand): Promise<AdminArticleCommandResult>
  cancelSchedule(command: ArticleVersionCommand): Promise<AdminArticleCommandResult>
  create(command: CreateAdminArticleCommand): Promise<AdminArticleCommandResult>
  publish(command: ArticleVersionCommand): Promise<AdminArticleCommandResult>
  schedule(command: ScheduleAdminArticleCommand): Promise<AdminArticleCommandResult>
  update(command: UpdateAdminArticleCommand): Promise<AdminArticleCommandResult>
}
