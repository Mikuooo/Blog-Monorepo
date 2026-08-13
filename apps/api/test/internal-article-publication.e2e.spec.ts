import { randomUUID } from 'node:crypto'

import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { INestApplication } from '@nestjs/common'

import { signWorkloadToken } from '@blog/shared/workload-token'

import { createApplication } from '../src/bootstrap.js'
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js'

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim()
const describeWithDatabase =
  testDatabaseUrl && new URL(testDatabaseUrl).pathname.endsWith('_test') ? describe : describe.skip

describeWithDatabase('internal scheduled article publication API', () => {
  const secret = 'a-secure-test-secret-with-32-bytes'
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl
    process.env.INTERNAL_WORKLOAD_AUDIENCE = 'blog-api-internal'
    process.env.INTERNAL_WORKLOAD_ISSUER = 'blog-worker'
    process.env.INTERNAL_WORKLOAD_SECRET = secret
    process.env.INTERNAL_WORKLOAD_SUBJECT = 'apps/worker'
    app = await createApplication({ disableLogger: true })
    await app.init()
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await cleanup()
    await prisma.client.user.create({
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
    await cleanup()
    await app.close()
  })

  it('rejects missing, expired, wrong-audience, wrong-subject and missing-scope identities', async () => {
    const articleId = randomUUID()
    await command(articleId).expect(401)
    await command(articleId, token({ aud: 'wrong' })).expect(401)
    await command(articleId, token({ sub: 'apps/admin' })).expect(401)
    await command(articleId, token({}, -60)).expect(401)
    await command(articleId, token({ scope: 'system.health' })).expect(403)
  })

  it('rejects unsupported contract versions and unknown articles with stable codes', async () => {
    const articleId = randomUUID()
    const invalid = await command(articleId, token()).send({
      contractVersion: 2,
      scheduleVersion: 1,
    })
    expect(invalid.status).toBe(400)
    expect(invalid.body).toMatchObject({ code: 'UNSUPPORTED_CONTRACT_VERSION', statusCode: 400 })

    const missing = await command(articleId, token()).send({
      contractVersion: 1,
      scheduleVersion: 1,
    })
    expect(missing.status).toBe(404)
    expect(missing.body).toMatchObject({ code: 'ARTICLE_NOT_FOUND', statusCode: 404 })
  })

  it('publishes once and returns ALREADY_APPLIED after a simulated lost response', async () => {
    const article = await createArticle(new Date(Date.now() - 60_000))
    const key = `publish-${article.id}-1`
    const first = await command(article.id, token(), key).send({
      contractVersion: 1,
      scheduleVersion: 1,
    })
    const retry = await command(article.id, token(), key).send({
      contractVersion: 1,
      scheduleVersion: 1,
    })

    expect(first.status).toBe(200)
    expect(first.body).toMatchObject({ outcome: 'PUBLISHED' })
    expect(retry.status).toBe(200)
    expect(retry.body).toMatchObject({ outcome: 'ALREADY_APPLIED' })
    expect(await prisma.client.articleRevision.count({ where: { articleId: article.id } })).toBe(1)
    expect(await prisma.client.outboxEvent.count({ where: { aggregateId: article.id } })).toBe(1)
  })

  it('rejects reuse of an idempotency key for a different command body', async () => {
    const article = await createArticle(new Date(Date.now() - 60_000), 2)
    const key = `publish-${article.id}`
    await command(article.id, token(), key)
      .send({ contractVersion: 1, scheduleVersion: 1 })
      .expect(200)

    const conflict = await command(article.id, token(), key).send({
      contractVersion: 1,
      scheduleVersion: 2,
    })

    expect(conflict.status).toBe(409)
    expect(conflict.body).toMatchObject({ code: 'IDEMPOTENCY_CONFLICT', statusCode: 409 })
  })

  it('returns STALE for an old schedule version and NOT_DUE with retryAt', async () => {
    const staleArticle = await createArticle(new Date(Date.now() - 60_000), 2)
    const stale = await command(staleArticle.id, token()).send({
      contractVersion: 1,
      scheduleVersion: 1,
    })
    expect(stale.body).toMatchObject({ outcome: 'STALE' })

    const future = new Date(Date.now() + 60_000)
    const notDueArticle = await createArticle(future)
    const notDue = await command(notDueArticle.id, token()).send({
      contractVersion: 1,
      scheduleVersion: 1,
    })
    expect(notDue.body).toMatchObject({ outcome: 'NOT_DUE', retryAt: future.toISOString() })
  })

  function command(articleId: string, accessToken?: string, key = `publish-${articleId}-1`) {
    const call = request(app.getHttpServer())
      .post(`/api/v1/internal/articles/${articleId}/publish-scheduled`)
      .set('Idempotency-Key', key)
    return accessToken ? call.set('Authorization', `Bearer ${accessToken}`) : call
  }

  function token(
    overrides: Partial<{ aud: string; scope: string; sub: string }> = {},
    lifetime = 60,
  ) {
    return signWorkloadToken(
      {
        aud: overrides.aud ?? 'blog-api-internal',
        iss: 'blog-worker',
        scope: overrides.scope ?? 'article.publish-scheduled',
        sub: overrides.sub ?? 'apps/worker',
      },
      secret,
      lifetime,
    )
  }

  async function createArticle(scheduledAt: Date, scheduleVersion = 1) {
    const actor = await prisma.client.user.findUniqueOrThrow({
      where: { username: 'article-scheduler' },
    })
    return prisma.client.article.create({
      data: {
        authorId: actor.id,
        content: 'scheduled content',
        scheduleVersion,
        scheduledAt,
        slug: `scheduled-${randomUUID()}`,
        status: 'SCHEDULED',
        title: 'Scheduled fixture',
      },
    })
  }

  async function cleanup(): Promise<void> {
    if (!prisma) return
    await prisma.client.$transaction([
      prisma.client.outboxDelivery.deleteMany(),
      prisma.client.outboxEvent.deleteMany(),
      prisma.client.commandReceipt.deleteMany(),
      prisma.client.auditLog.deleteMany(),
      prisma.client.articleRevision.deleteMany(),
      prisma.client.article.deleteMany(),
      prisma.client.user.deleteMany(),
    ])
  }
})
