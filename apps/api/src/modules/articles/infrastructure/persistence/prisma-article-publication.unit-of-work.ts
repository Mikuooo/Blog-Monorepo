import { Inject, Injectable } from '@nestjs/common'

import type { DatabaseClient } from '@blog/database'

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js'
import type {
  ArticleForScheduledPublication,
  ArticlePublicationPorts,
  ArticlePublicationUnitOfWork,
  PublishScheduledArticleOutcome,
} from '../../application/article-publication.contract.js'
import { ArticlePublicationError } from '../../application/article-publication.errors.js'

type TransactionClient = Parameters<Parameters<DatabaseClient['$transaction']>[0]>[0]
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
type JsonObject = { [key: string]: JsonValue }

const SYSTEM_ACTOR_USERNAME = 'article-scheduler'
const OUTBOX_DELIVERIES: Array<{ consumerKey: string; jobName: string; queueName: string }> = [
  {
    consumerKey: 'article.search-index.v1',
    jobName: 'article.search-index',
    queueName: 'articles',
  },
  {
    consumerKey: 'article.cache-revalidate.v1',
    jobName: 'article.cache-revalidate',
    queueName: 'articles',
  },
  { consumerKey: 'article.feed-update.v1', jobName: 'article.feed-update', queueName: 'articles' },
]

@Injectable()
export class PrismaArticlePublicationUnitOfWork implements ArticlePublicationUnitOfWork {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async execute<T>(work: (ports: ArticlePublicationPorts) => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.client.$transaction(
          async (transaction) => work(this.createPorts(transaction)),
          { isolationLevel: 'Serializable', maxWait: 5_000, timeout: 10_000 },
        )
      } catch (error) {
        if (!isSerializationConflict(error)) throw error
        if (attempt === 3) throw new ArticlePublicationError('PUBLICATION_CONFLICT')
      }
    }
    throw new ArticlePublicationError('PUBLICATION_CONFLICT')
  }

  private createPorts(transaction: TransactionClient): ArticlePublicationPorts {
    return {
      articles: {
        appendRevision: async ({ article, createdById, version }) => {
          const actor = await this.requireSystemActor(transaction, createdById)
          return transaction.articleRevision.create({
            data: {
              articleId: article.id,
              content: article.content,
              createdById: actor.id,
              summary: article.summary,
              title: article.title,
              version,
            },
            select: { id: true },
          })
        },
        findForScheduledPublication: async (articleId) => {
          await transaction.$queryRaw`SELECT id FROM articles WHERE id = ${articleId}::uuid FOR UPDATE`
          const [article, clock] = await Promise.all([
            transaction.article.findUnique({
              select: {
                content: true,
                deletedAt: true,
                id: true,
                publishedAt: true,
                scheduleVersion: true,
                scheduledAt: true,
                status: true,
                summary: true,
                title: true,
                version: true,
              },
              where: { id: articleId },
            }),
            transaction.$queryRaw<Array<{ database_now: Date }>>`
              SELECT CURRENT_TIMESTAMP AS database_now
            `,
          ])
          return article && clock[0]
            ? ({ ...article, databaseNow: clock[0].database_now } as ArticleForScheduledPublication)
            : null
        },
        markPublished: async ({ articleId, expectedScheduleVersion, expectedVersion }) => {
          const rows = await transaction.$queryRaw<Array<{ published_at: Date; version: number }>>`
            UPDATE articles
               SET status = 'published'::article_status,
                   published_at = CURRENT_TIMESTAMP,
                   scheduled_at = NULL,
                   version = version + 1,
                   updated_at = CURRENT_TIMESTAMP
             WHERE id = ${articleId}::uuid
               AND status = 'scheduled'::article_status
               AND schedule_version = ${expectedScheduleVersion}
               AND version = ${expectedVersion}
               AND scheduled_at <= CURRENT_TIMESTAMP
               AND deleted_at IS NULL
         RETURNING published_at, version
          `
          const row = rows[0]
          return row ? { publishedAt: row.published_at, version: row.version } : null
        },
      },
      audit: {
        appendArticlePublication: async ({ actorId, articleId, correlationId, publishedAt }) => {
          const actor = await this.requireSystemActor(transaction, actorId)
          await transaction.auditLog.create({
            data: {
              action: 'article.publish-scheduled',
              after: { publishedAt: publishedAt.toISOString(), status: 'published' },
              resource: 'article',
              resourceId: articleId,
              userId: actor.id,
              ...(correlationId ? { requestId: correlationId } : {}),
            },
          })
        },
      },
      commandReceipts: {
        claim: async ({ commandType, idempotencyKey, requestHash }) => {
          await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${commandType}:${idempotencyKey}`}, 0))`
          const existing = await transaction.commandReceipt.findUnique({
            where: { commandType_idempotencyKey: { commandType, idempotencyKey } },
          })
          if (!existing) {
            await transaction.commandReceipt.create({
              data: { commandType, idempotencyKey, requestHash },
            })
            return { state: 'CLAIMED' }
          }
          if (existing.requestHash !== requestHash) {
            throw new ArticlePublicationError('IDEMPOTENCY_CONFLICT')
          }
          if (existing.status !== 'COMPLETED' || !existing.result) {
            throw new ArticlePublicationError('IDEMPOTENCY_IN_PROGRESS')
          }
          const result = existing.result as PublishScheduledArticleOutcome
          if (result.outcome === 'NOT_DUE') {
            await transaction.commandReceipt.delete({
              where: { id: existing.id },
            })
            await transaction.commandReceipt.create({
              data: { commandType, idempotencyKey, requestHash },
            })
            return { state: 'CLAIMED' }
          }
          return {
            result,
            state: 'COMPLETED',
          }
        },
        complete: async ({ commandType, idempotencyKey, result }) => {
          await transaction.commandReceipt.update({
            data: { completedAt: new Date(), result: result as JsonObject, status: 'COMPLETED' },
            where: { commandType_idempotencyKey: { commandType, idempotencyKey } },
          })
        },
      },
      outbox: {
        appendArticlePublished: async ({ event, payloadHash }) => {
          await transaction.outboxEvent.create({
            data: {
              aggregateId: event.aggregate.id,
              aggregateSequence: event.aggregate.sequence,
              aggregateType: event.aggregate.type,
              deliveries: { create: OUTBOX_DELIVERIES },
              eventName: event.eventName,
              eventVersion: event.eventVersion,
              id: event.eventId,
              occurredAt: new Date(event.occurredAt),
              payload: event as unknown as JsonObject,
              payloadHash,
              ...(event.metadata.actorId ? { actorId: event.metadata.actorId } : {}),
              ...(event.metadata.causationId ? { causationId: event.metadata.causationId } : {}),
              ...(event.metadata.correlationId
                ? { correlationId: event.metadata.correlationId }
                : {}),
              ...(event.metadata.traceparent ? { traceparent: event.metadata.traceparent } : {}),
            },
          })
        },
      },
    }
  }

  private async requireSystemActor(transaction: TransactionClient, actorId: string) {
    if (actorId !== SYSTEM_ACTOR_USERNAME) throw new ArticlePublicationError('PUBLICATION_CONFLICT')
    const actor = await transaction.user.findUnique({
      select: { id: true },
      where: { username: SYSTEM_ACTOR_USERNAME },
    })
    if (!actor) throw new ArticlePublicationError('PUBLICATION_CONFLICT')
    return actor
  }
}

function isSerializationConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as {
    code?: unknown
    meta?: { driverAdapterError?: { cause?: { originalCode?: unknown } } }
  }
  return (
    candidate.code === 'P2034' ||
    (candidate.code === 'P2010' &&
      candidate.meta?.driverAdapterError?.cause?.originalCode === '40001')
  )
}
