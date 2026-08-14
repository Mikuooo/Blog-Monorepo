import { createHash, randomUUID } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'

import type { DatabaseClient } from '@blog/database'
import {
  articlePublicationScheduledEventV1Schema,
  articlePublishedEventV1Schema,
} from '@blog/event-contracts'

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js'
import type {
  AdminArticleCommandRepository,
  AdminArticleCommandResult,
  ArticleCommandStatus,
  ArticleVersionCommand,
  CreateAdminArticleCommand,
  ScheduleAdminArticleCommand,
  UpdateAdminArticleCommand,
} from '../../application/admin-article-command.contract.js'
import { AdminArticleCommandError } from '../../application/admin-article-command.errors.js'

type TransactionClient = Parameters<Parameters<DatabaseClient['$transaction']>[0]>[0]
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
type JsonObject = { [key: string]: JsonValue }

const OUTBOX_DELIVERIES = [
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
] as const

const mutableSelect = {
  content: true,
  deletedAt: true,
  id: true,
  passwordHash: true,
  publishedAt: true,
  scheduleVersion: true,
  scheduledAt: true,
  slug: true,
  status: true,
  summary: true,
  title: true,
  version: true,
  visibility: true,
} as const

@Injectable()
export class PrismaAdminArticleCommandRepository implements AdminArticleCommandRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(command: CreateAdminArticleCommand): Promise<AdminArticleCommandResult> {
    return this.execute(async (transaction) => {
      await validateReferences(transaction, command)
      const visibility = command.visibility ?? 'PUBLIC'
      if (visibility === 'PASSWORD' && !command.passwordHash) {
        throw new AdminArticleCommandError('ARTICLE_PASSWORD_REQUIRED')
      }
      const article = await transaction.article.create({
        data: {
          allowComment: command.allowComment ?? true,
          authorId: command.actorId,
          canonicalUrl: command.canonicalUrl ?? null,
          categoryId: command.categoryId ?? null,
          content: command.content,
          contentHtml: null,
          coverId: command.coverId ?? null,
          isFeatured: command.isFeatured ?? false,
          isPinned: command.isPinned ?? false,
          passwordHash: visibility === 'PASSWORD' ? (command.passwordHash ?? null) : null,
          readingTime: readingTime(command.content),
          seoDescription: command.seoDescription ?? null,
          seoTitle: command.seoTitle ?? null,
          slug: command.slug,
          status: 'DRAFT',
          summary: command.summary ?? null,
          title: command.title,
          visibility,
          wordCount: wordCount(command.content),
          ...(command.tagIds?.length
            ? { tags: { createMany: { data: command.tagIds.map((tagId) => ({ tagId })) } } }
            : {}),
        },
        select: mutableSelect,
      })
      const revision = await appendRevision(transaction, article, command.actorId)
      await appendAudit(transaction, {
        action: 'article.create',
        actorId: command.actorId,
        after: auditSnapshot(article),
        articleId: article.id,
      })
      return commandResult(article, revision.id)
    })
  }

  async update(command: UpdateAdminArticleCommand): Promise<AdminArticleCommandResult> {
    return this.execute(async (transaction) => {
      const current = await findForUpdate(transaction, command.articleId)
      requireVersion(current.version, command.expectedVersion)
      if (current.status === 'ARCHIVED') throw new AdminArticleCommandError('ARTICLE_INVALID_STATE')
      await validateReferences(transaction, command)

      const visibility = command.visibility ?? current.visibility
      let passwordHash = current.passwordHash
      if (command.clearPassword) passwordHash = null
      if (command.passwordHash) passwordHash = command.passwordHash
      if (visibility !== 'PASSWORD') passwordHash = null
      if (visibility === 'PASSWORD' && !passwordHash) {
        throw new AdminArticleCommandError('ARTICLE_PASSWORD_REQUIRED')
      }
      const content = command.content ?? current.content
      const article = await transaction.article.update({
        data: {
          ...(command.allowComment === undefined ? {} : { allowComment: command.allowComment }),
          ...(command.canonicalUrl === undefined ? {} : { canonicalUrl: command.canonicalUrl }),
          ...(command.categoryId === undefined ? {} : { categoryId: command.categoryId }),
          ...(command.content === undefined ? {} : { content: command.content, contentHtml: null }),
          ...(command.coverId === undefined ? {} : { coverId: command.coverId }),
          ...(command.isFeatured === undefined ? {} : { isFeatured: command.isFeatured }),
          ...(command.isPinned === undefined ? {} : { isPinned: command.isPinned }),
          passwordHash,
          readingTime: readingTime(content),
          ...(command.seoDescription === undefined
            ? {}
            : { seoDescription: command.seoDescription }),
          ...(command.seoTitle === undefined ? {} : { seoTitle: command.seoTitle }),
          ...(command.slug === undefined ? {} : { slug: command.slug }),
          ...(command.summary === undefined ? {} : { summary: command.summary }),
          ...(command.title === undefined ? {} : { title: command.title }),
          version: { increment: 1 },
          visibility,
          wordCount: wordCount(content),
        },
        select: mutableSelect,
        where: { id: current.id },
      })
      if (command.tagIds) {
        await transaction.articleTag.deleteMany({ where: { articleId: article.id } })
        if (command.tagIds.length) {
          await transaction.articleTag.createMany({
            data: command.tagIds.map((tagId) => ({ articleId: article.id, tagId })),
          })
        }
      }
      const revision = await appendRevision(transaction, article, command.actorId)
      await appendAudit(transaction, {
        action: 'article.update',
        actorId: command.actorId,
        after: auditSnapshot(article),
        articleId: article.id,
        before: auditSnapshot(current),
      })
      return commandResult(article, revision.id)
    })
  }

  publish(command: ArticleVersionCommand): Promise<AdminArticleCommandResult> {
    return this.transition(command, 'PUBLISHED')
  }

  schedule(command: ScheduleAdminArticleCommand): Promise<AdminArticleCommandResult> {
    return this.execute(async (transaction) => {
      const current = await findForUpdate(transaction, command.articleId)
      requireVersion(current.version, command.expectedVersion)
      if (current.status !== 'DRAFT') throw new AdminArticleCommandError('ARTICLE_INVALID_STATE')
      const [clock] = await transaction.$queryRaw<Array<{ database_now: Date }>>`
        SELECT CURRENT_TIMESTAMP AS database_now
      `
      if (!clock || command.scheduledAt <= clock.database_now) {
        throw new AdminArticleCommandError('ARTICLE_INVALID_SCHEDULE_TIME')
      }
      const article = await transaction.article.update({
        data: {
          scheduleVersion: { increment: 1 },
          scheduledAt: command.scheduledAt,
          status: 'SCHEDULED',
          version: { increment: 1 },
        },
        select: mutableSelect,
        where: { id: current.id },
      })
      await appendAudit(transaction, {
        action: 'article.schedule',
        actorId: command.actorId,
        after: auditSnapshot(article),
        articleId: article.id,
        before: auditSnapshot(current),
      })
      await appendPublicationScheduledEvent(transaction, article, command.actorId)
      return commandResult(article)
    })
  }

  cancelSchedule(command: ArticleVersionCommand): Promise<AdminArticleCommandResult> {
    return this.transition(command, 'DRAFT')
  }

  archive(command: ArticleVersionCommand): Promise<AdminArticleCommandResult> {
    return this.transition(command, 'ARCHIVED')
  }

  private async transition(
    command: ArticleVersionCommand,
    target: 'ARCHIVED' | 'DRAFT' | 'PUBLISHED',
  ): Promise<AdminArticleCommandResult> {
    return this.execute(async (transaction) => {
      const current = await findForUpdate(transaction, command.articleId)
      requireVersion(current.version, command.expectedVersion)
      const allowed =
        target === 'PUBLISHED'
          ? current.status === 'DRAFT' || current.status === 'SCHEDULED'
          : target === 'DRAFT'
            ? current.status === 'SCHEDULED'
            : current.status !== 'ARCHIVED'
      if (!allowed) throw new AdminArticleCommandError('ARTICLE_INVALID_STATE')

      const now = new Date()
      const article = await transaction.article.update({
        data: {
          ...(current.status === 'SCHEDULED' ? { scheduleVersion: { increment: 1 } } : {}),
          ...(target === 'PUBLISHED' ? { publishedAt: now } : {}),
          scheduledAt: null,
          status: target,
          version: { increment: 1 },
        },
        select: mutableSelect,
        where: { id: current.id },
      })
      const revision =
        target === 'PUBLISHED' ? await appendRevision(transaction, article, command.actorId) : null
      await appendAudit(transaction, {
        action: `article.${target.toLowerCase()}`,
        actorId: command.actorId,
        after: auditSnapshot(article),
        articleId: article.id,
        before: auditSnapshot(current),
      })
      if (target === 'PUBLISHED' && revision && article.publishedAt) {
        await appendPublishedEvent(transaction, article, revision.id, command.actorId)
      }
      return commandResult(article, revision?.id)
    })
  }

  private async execute<T>(work: (transaction: TransactionClient) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.client.$transaction(work, {
        isolationLevel: 'Serializable',
        maxWait: 5_000,
        timeout: 10_000,
      })
    } catch (error) {
      if (error instanceof AdminArticleCommandError) throw error
      if (isUniqueConflict(error)) throw new AdminArticleCommandError('ARTICLE_SLUG_EXISTS')
      if (isSerializationConflict(error)) {
        throw new AdminArticleCommandError('ARTICLE_VERSION_CONFLICT')
      }
      throw error
    }
  }
}

async function findForUpdate(transaction: TransactionClient, articleId: string) {
  await transaction.$queryRaw`SELECT id FROM articles WHERE id = ${articleId}::uuid FOR UPDATE`
  const article = await transaction.article.findFirst({
    select: mutableSelect,
    where: { deletedAt: null, id: articleId },
  })
  if (!article) throw new AdminArticleCommandError('ARTICLE_NOT_FOUND')
  return article
}

function requireVersion(actual: number, expected: number): void {
  if (actual !== expected) throw new AdminArticleCommandError('ARTICLE_VERSION_CONFLICT')
}

async function validateReferences(
  transaction: TransactionClient,
  input: { categoryId?: string | null; coverId?: string | null; tagIds?: string[] },
): Promise<void> {
  if (input.categoryId) {
    const category = await transaction.category.findFirst({
      select: { id: true },
      where: { deletedAt: null, id: input.categoryId },
    })
    if (!category) throw new AdminArticleCommandError('ARTICLE_CATEGORY_NOT_FOUND')
  }
  if (input.coverId) {
    const cover = await transaction.media.findFirst({
      select: { id: true },
      where: { deletedAt: null, id: input.coverId },
    })
    if (!cover) throw new AdminArticleCommandError('ARTICLE_COVER_NOT_FOUND')
  }
  if (input.tagIds) {
    const uniqueTagIds = [...new Set(input.tagIds)]
    const count = await transaction.tag.count({ where: { id: { in: uniqueTagIds } } })
    if (count !== uniqueTagIds.length) throw new AdminArticleCommandError('ARTICLE_TAG_NOT_FOUND')
  }
}

async function appendRevision(
  transaction: TransactionClient,
  article: { content: string; id: string; summary: string | null; title: string; version: number },
  actorId: string,
) {
  return transaction.articleRevision.create({
    data: {
      articleId: article.id,
      content: article.content,
      createdById: actorId,
      summary: article.summary,
      title: article.title,
      version: article.version,
    },
    select: { id: true },
  })
}

async function appendAudit(
  transaction: TransactionClient,
  input: {
    action: string
    actorId: string
    after: JsonObject
    articleId: string
    before?: JsonObject
  },
): Promise<void> {
  await transaction.auditLog.create({
    data: {
      action: input.action,
      after: input.after,
      ...(input.before ? { before: input.before } : {}),
      resource: 'article',
      resourceId: input.articleId,
      userId: input.actorId,
    },
  })
}

async function appendPublishedEvent(
  transaction: TransactionClient,
  article: { id: string; publishedAt: Date | null; version: number },
  revisionId: string,
  actorId: string,
): Promise<void> {
  if (!article.publishedAt) throw new AdminArticleCommandError('ARTICLE_INVALID_STATE')
  const event = articlePublishedEventV1Schema.parse({
    aggregate: { id: article.id, sequence: article.version, type: 'article' },
    data: { articleId: article.id, revisionId },
    envelopeVersion: 1,
    eventId: randomUUID(),
    eventName: 'article.published',
    eventVersion: 1,
    metadata: { actorId },
    occurredAt: article.publishedAt.toISOString(),
  })
  await transaction.outboxEvent.create({
    data: {
      actorId,
      aggregateId: article.id,
      aggregateSequence: BigInt(article.version),
      aggregateType: 'article',
      deliveries: { create: OUTBOX_DELIVERIES.map((delivery) => ({ ...delivery })) },
      eventName: event.eventName,
      eventVersion: event.eventVersion,
      id: event.eventId,
      occurredAt: article.publishedAt,
      payload: event as unknown as JsonObject,
      payloadHash: createHash('sha256').update(JSON.stringify(event)).digest('hex'),
    },
  })
}

async function appendPublicationScheduledEvent(
  transaction: TransactionClient,
  article: {
    id: string
    scheduledAt: Date | null
    scheduleVersion: number
    version: number
  },
  actorId: string,
): Promise<void> {
  if (!article.scheduledAt) throw new AdminArticleCommandError('ARTICLE_INVALID_STATE')
  const occurredAt = new Date()
  const event = articlePublicationScheduledEventV1Schema.parse({
    aggregate: { id: article.id, sequence: article.version, type: 'article' },
    data: {
      articleId: article.id,
      scheduleVersion: article.scheduleVersion,
      scheduledAt: article.scheduledAt.toISOString(),
    },
    envelopeVersion: 1,
    eventId: randomUUID(),
    eventName: 'article.publication-scheduled',
    eventVersion: 1,
    metadata: { actorId },
    occurredAt: occurredAt.toISOString(),
  })
  await transaction.outboxEvent.create({
    data: {
      actorId,
      aggregateId: article.id,
      aggregateSequence: BigInt(article.version),
      aggregateType: 'article',
      deliveries: {
        create: {
          consumerKey: 'article.publish-scheduled.v1',
          jobName: 'article.publish-scheduled',
          nextAttemptAt: article.scheduledAt,
          queueName: 'article-commands',
        },
      },
      eventName: event.eventName,
      eventVersion: event.eventVersion,
      id: event.eventId,
      occurredAt,
      payload: event as unknown as JsonObject,
      payloadHash: createHash('sha256').update(JSON.stringify(event)).digest('hex'),
    },
  })
}

function commandResult(
  article: {
    id: string
    passwordHash: string | null
    publishedAt: Date | null
    scheduleVersion: number
    scheduledAt: Date | null
    status: ArticleCommandStatus
    version: number
  },
  revisionId?: string,
): AdminArticleCommandResult {
  return {
    articleId: article.id,
    passwordProtected: Boolean(article.passwordHash),
    publishedAt: article.publishedAt?.toISOString() ?? null,
    ...(revisionId ? { revisionId } : {}),
    scheduledAt: article.scheduledAt?.toISOString() ?? null,
    scheduleVersion: article.scheduleVersion,
    status: article.status,
    version: article.version,
  }
}

function auditSnapshot(article: {
  id: string
  publishedAt: Date | null
  scheduledAt: Date | null
  scheduleVersion: number
  slug: string
  status: ArticleCommandStatus
  version: number
  visibility: string
}): JsonObject {
  return {
    id: article.id,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    scheduledAt: article.scheduledAt?.toISOString() ?? null,
    scheduleVersion: article.scheduleVersion,
    slug: article.slug,
    status: article.status,
    version: article.version,
    visibility: article.visibility,
  }
}

function wordCount(content: string): number {
  return content.trim() ? content.trim().split(/\s+/u).length : 0
}

function readingTime(content: string): number {
  const words = wordCount(content)
  return words === 0 ? 0 : Math.max(1, Math.ceil(words / 200))
}

function isUniqueConflict(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
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
