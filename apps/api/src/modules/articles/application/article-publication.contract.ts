import type { ArticlePublishedEventV1 } from '@blog/event-contracts'

export const ARTICLE_PUBLICATION_UNIT_OF_WORK = Symbol('ARTICLE_PUBLICATION_UNIT_OF_WORK')

export type PublishScheduledArticleCommand = {
  articleId: string
  correlationId?: string
  idempotencyKey: string
  requestHash: string
  scheduleVersion: number
}

export type PublishScheduledArticleOutcome =
  | { outcome: 'PUBLISHED'; articleId: string; publishedAt: string; revisionId: string }
  | { outcome: 'ALREADY_APPLIED'; articleId: string; publishedAt: string; revisionId: string }
  | { outcome: 'STALE'; articleId: string }
  | { outcome: 'NOT_DUE'; articleId: string; retryAt: string }

export type ArticleForScheduledPublication = {
  content: string
  databaseNow: Date
  deletedAt: Date | null
  id: string
  publishedAt: Date | null
  scheduleVersion: number
  scheduledAt: Date | null
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED'
  summary: string | null
  title: string
  version: number
}

export type ClaimedCommandReceipt =
  { state: 'CLAIMED' } | { state: 'COMPLETED'; result: PublishScheduledArticleOutcome }

export interface ArticlePublicationRepository {
  appendRevision(input: {
    article: ArticleForScheduledPublication
    createdById: string
    version: number
  }): Promise<{ id: string }>
  findForScheduledPublication(articleId: string): Promise<ArticleForScheduledPublication | null>
  markPublished(input: {
    articleId: string
    expectedScheduleVersion: number
    expectedVersion: number
  }): Promise<{ publishedAt: Date; version: number } | null>
}

export interface CommandReceiptWriter {
  claim(input: {
    commandType: string
    idempotencyKey: string
    requestHash: string
  }): Promise<ClaimedCommandReceipt>
  complete(input: {
    commandType: string
    idempotencyKey: string
    result: PublishScheduledArticleOutcome
  }): Promise<void>
}

export interface AuditAppender {
  appendArticlePublication(input: {
    actorId: string
    articleId: string
    correlationId?: string
    publishedAt: Date
  }): Promise<void>
}

export interface OutboxWriter {
  appendArticlePublished(input: {
    event: ArticlePublishedEventV1
    payloadHash: string
  }): Promise<void>
}

export type ArticlePublicationPorts = {
  articles: ArticlePublicationRepository
  audit: AuditAppender
  commandReceipts: CommandReceiptWriter
  outbox: OutboxWriter
}

export interface ArticlePublicationUnitOfWork {
  execute<T>(work: (ports: ArticlePublicationPorts) => Promise<T>): Promise<T>
}
