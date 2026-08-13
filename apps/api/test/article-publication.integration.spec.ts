import { createHash, randomUUID } from 'node:crypto'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js'
import type { PublishScheduledArticleCommand } from '../src/modules/articles/application/article-publication.contract.js'
import { ArticlesService } from '../src/modules/articles/application/articles.service.js'
import { PrismaArticlePublicationUnitOfWork } from '../src/modules/articles/infrastructure/persistence/prisma-article-publication.unit-of-work.js'

const databaseUrl = process.env.TEST_DATABASE_URL?.trim()
const isDedicatedTestDatabase = databaseUrl
  ? new URL(databaseUrl).pathname.endsWith('_test')
  : false
const describeWithDatabase = isDedicatedTestDatabase ? describe : describe.skip

describeWithDatabase('scheduled article publication transaction', () => {
  let database: PrismaService['client']
  let prisma: PrismaService
  let service: ArticlesService

  beforeAll(async () => {
    if (!databaseUrl) return
    process.env.DATABASE_URL = databaseUrl
    prisma = new PrismaService()
    database = prisma.client
    const unitOfWork = new PrismaArticlePublicationUnitOfWork(prisma)
    service = new ArticlesService(unitOfWork)
  })

  beforeEach(async () => {
    await cleanup()
    await database.user.create({
      data: {
        displayName: 'Article Scheduler',
        email: 'article-scheduler@internal.invalid',
        passwordHash: '!service-identity-no-interactive-login',
        status: 'DISABLED',
        username: 'article-scheduler',
      },
    })
  })

  afterAll(async () => {
    if (!database) return
    await cleanup()
    await prisma.onModuleDestroy()
  })

  it('atomically publishes article, revision, audit, receipt, outbox and deliveries', async () => {
    const article = await createScheduledArticle()
    const command = createCommand(article.id, article.scheduleVersion)

    await expect(service.publishScheduled(command)).resolves.toMatchObject({
      articleId: article.id,
      outcome: 'PUBLISHED',
    })

    const [storedArticle, revisions, audits, receipts, events] = await Promise.all([
      database.article.findUniqueOrThrow({ where: { id: article.id } }),
      database.articleRevision.findMany({ where: { articleId: article.id } }),
      database.auditLog.findMany({ where: { resourceId: article.id } }),
      database.commandReceipt.findMany({ where: { idempotencyKey: command.idempotencyKey } }),
      database.outboxEvent.findMany({
        include: { deliveries: true },
        where: { aggregateId: article.id },
      }),
    ])

    expect(storedArticle).toMatchObject({ status: 'PUBLISHED', version: 2 })
    expect(storedArticle.publishedAt).toBeInstanceOf(Date)
    expect(storedArticle.scheduledAt).toBeNull()
    expect(revisions).toHaveLength(1)
    expect(revisions[0]).toMatchObject({ title: article.title, version: 2 })
    expect(audits).toHaveLength(1)
    expect(receipts).toHaveLength(1)
    expect(receipts[0]).toMatchObject({ status: 'COMPLETED' })
    expect(events).toHaveLength(1)
    expect(events[0]?.deliveries).toHaveLength(3)
  })

  it('returns the persisted result without duplicating effects for the same command', async () => {
    const article = await createScheduledArticle()
    const command = createCommand(article.id, article.scheduleVersion)

    const first = await service.publishScheduled(command)
    const second = await service.publishScheduled(command)

    expect(first.outcome).toBe('PUBLISHED')
    expect(second.outcome).toBe('ALREADY_APPLIED')
    await expect(countEffects(article.id)).resolves.toEqual({
      audits: 1,
      deliveries: 3,
      events: 1,
      receipts: 1,
      revisions: 1,
    })
  })

  it('rejects an idempotency key reused with a different request hash', async () => {
    const article = await createScheduledArticle()
    const command = createCommand(article.id, article.scheduleVersion)
    await service.publishScheduled(command)

    await expect(
      service.publishScheduled({ ...command, requestHash: 'f'.repeat(64) }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' })
    await expect(countEffects(article.id)).resolves.toMatchObject({ events: 1, revisions: 1 })
  })

  it('re-evaluates NOT_DUE with the same command when its schedule becomes due', async () => {
    const article = await createScheduledArticle(new Date(Date.now() + 60_000))
    const command = createCommand(article.id, article.scheduleVersion)

    await expect(service.publishScheduled(command)).resolves.toMatchObject({ outcome: 'NOT_DUE' })
    await database.article.update({
      data: { scheduledAt: new Date(Date.now() - 60_000) },
      where: { id: article.id },
    })
    await expect(service.publishScheduled(command)).resolves.toMatchObject({ outcome: 'PUBLISHED' })
    await expect(countEffects(article.id)).resolves.toMatchObject({
      events: 1,
      receipts: 1,
      revisions: 1,
    })
  })

  it('allows only one effect set when two commands race the same schedule version', async () => {
    const article = await createScheduledArticle()
    const left = createCommand(article.id, article.scheduleVersion, 'race-left')
    const right = createCommand(article.id, article.scheduleVersion, 'race-right')

    const results = await Promise.allSettled([
      service.publishScheduled(left),
      service.publishScheduled(right),
    ])
    const published = results.filter(
      (result) => result.status === 'fulfilled' && result.value.outcome === 'PUBLISHED',
    )
    const stale = results.filter(
      (result) => result.status === 'fulfilled' && result.value.outcome === 'STALE',
    )

    expect(published).toHaveLength(1)
    expect(stale).toHaveLength(1)
    await expect(countEffects(article.id)).resolves.toEqual({
      audits: 1,
      deliveries: 3,
      events: 1,
      receipts: 2,
      revisions: 1,
    })
  })

  it('rolls every write back when publication cannot append its required revision', async () => {
    const author = await database.user.findUniqueOrThrow({
      where: { username: 'article-scheduler' },
    })
    const article = await database.article.create({
      data: {
        authorId: author.id,
        content: 'scheduled content',
        scheduledAt: new Date(Date.now() - 60_000),
        slug: `rollback-${randomUUID()}`,
        status: 'SCHEDULED',
        title: 'Rollback fixture',
        version: 1,
      },
    })
    await database.articleRevision.create({
      data: {
        articleId: article.id,
        content: article.content,
        createdById: author.id,
        title: article.title,
        version: 2,
      },
    })

    await expect(
      service.publishScheduled(createCommand(article.id, article.scheduleVersion)),
    ).rejects.toThrow()

    const stored = await database.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(stored).toMatchObject({
      publishedAt: null,
      scheduledAt: article.scheduledAt,
      status: 'SCHEDULED',
    })
    await expect(countEffects(article.id)).resolves.toEqual({
      audits: 0,
      deliveries: 0,
      events: 0,
      receipts: 0,
      revisions: 1,
    })
  })

  async function cleanup(): Promise<void> {
    await database?.$transaction([
      database.outboxDelivery.deleteMany(),
      database.outboxEvent.deleteMany(),
      database.commandReceipt.deleteMany(),
      database.auditLog.deleteMany(),
      database.articleRevision.deleteMany(),
      database.article.deleteMany(),
      database.user.deleteMany(),
    ])
  }

  async function createScheduledArticle(scheduledAt = new Date(Date.now() - 60_000)) {
    const author = await database.user.findUniqueOrThrow({
      where: { username: 'article-scheduler' },
    })
    return database.article.create({
      data: {
        authorId: author.id,
        content: 'scheduled content',
        scheduledAt,
        slug: `scheduled-${randomUUID()}`,
        status: 'SCHEDULED',
        summary: 'scheduled summary',
        title: 'Scheduled fixture',
      },
    })
  }

  function createCommand(
    articleId: string,
    scheduleVersion: number,
    key = `publish-${articleId}-${scheduleVersion}`,
  ): PublishScheduledArticleCommand {
    const requestHash = createHash('sha256')
      .update(JSON.stringify({ articleId, contractVersion: 1, scheduleVersion }))
      .digest('hex')
    return { articleId, idempotencyKey: key, requestHash, scheduleVersion }
  }

  async function countEffects(articleId: string) {
    const [revisions, audits, receipts, events, deliveries] = await Promise.all([
      database.articleRevision.count({ where: { articleId } }),
      database.auditLog.count({ where: { resourceId: articleId } }),
      database.commandReceipt.count(),
      database.outboxEvent.count({ where: { aggregateId: articleId } }),
      database.outboxDelivery.count({ where: { event: { aggregateId: articleId } } }),
    ])
    return { audits, deliveries, events, receipts, revisions }
  }
})
