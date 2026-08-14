import { randomUUID } from 'node:crypto'

import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { INestApplication } from '@nestjs/common'

import { hashPassword } from '@blog/shared/password'

import { createApplication } from '../src/bootstrap.js'
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js'

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim()
const describeWithDatabase =
  testDatabaseUrl && new URL(testDatabaseUrl).pathname.endsWith('_test') ? describe : describe.skip

describeWithDatabase('administration article command API', () => {
  const origin = 'http://localhost:3002'
  const password = 'test-administrator-password'
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    process.env.ADMIN_ORIGIN = origin
    process.env.AUTH_SESSION_COOKIE_NAME = 'blog_session'
    process.env.AUTH_SESSION_TTL_SECONDS = '3600'
    process.env.DATABASE_URL = testDatabaseUrl
    app = await createApplication({ disableLogger: true })
    await app.init()
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await cleanup()
    const permissions = await Promise.all(
      ['article.read', 'article.create', 'article.update', 'article.publish'].map((code) =>
        prisma.client.permission.create({ data: { code } }),
      ),
    )
    const role = await prisma.client.role.create({ data: { code: 'EDITOR', name: 'Editor' } })
    await prisma.client.rolePermission.createMany({
      data: permissions.map((permission) => ({ permissionId: permission.id, roleId: role.id })),
    })
    const user = await prisma.client.user.create({
      data: {
        displayName: 'Article Editor',
        email: 'command-editor@blog.local',
        passwordHash: await hashPassword(password),
        username: 'command-editor',
      },
    })
    await prisma.client.userRole.create({ data: { roleId: role.id, userId: user.id } })
  })

  afterAll(async () => {
    await cleanup()
    await app.close()
  })

  it('requires authentication, trusted origin and the operation-specific permission', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/articles')
      .set('Origin', origin)
      .send(createBody())
      .expect(401)

    const cookie = await login()
    const createPermission = await prisma.client.permission.findUniqueOrThrow({
      where: { code: 'article.create' },
    })
    await prisma.client.rolePermission.deleteMany({
      where: { permissionId: createPermission.id },
    })
    const forbidden = await request(app.getHttpServer())
      .post('/api/v1/admin/articles')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send(createBody())
    expect(forbidden.status).toBe(403)
    expect(forbidden.body).toMatchObject({ code: 'PERMISSION_DENIED', statusCode: 403 })

    const untrusted = await request(app.getHttpServer())
      .patch(`/api/v1/admin/articles/${randomUUID()}`)
      .set('Cookie', cookie)
      .set('Origin', 'https://attacker.invalid')
      .send({ expectedVersion: 1, title: 'Blocked' })
    expect(untrusted.status).toBe(403)
    expect(untrusted.body).toMatchObject({ code: 'UNTRUSTED_ORIGIN', statusCode: 403 })
  })

  it('creates a password-protected draft atomically without exposing its password', async () => {
    const cookie = await login()
    const category = await prisma.client.category.create({
      data: { name: 'Engineering', slug: `engineering-${randomUUID()}` },
    })
    const tag = await prisma.client.tag.create({
      data: { name: `PostgreSQL ${randomUUID()}`, slug: `postgresql-${randomUUID()}` },
    })
    const body = {
      ...createBody(),
      categoryId: category.id,
      password: 'article-reader-password',
      tagIds: [tag.id],
      visibility: 'PASSWORD',
    }
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/articles')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send(body)
      .expect(201)
    expect(response.body).toMatchObject({
      passwordProtected: true,
      scheduleVersion: 1,
      status: 'DRAFT',
      version: 1,
    })
    expect(response.body).not.toHaveProperty('passwordHash')

    const article = await prisma.client.article.findUniqueOrThrow({
      include: { revisions: true, tags: true },
      where: { id: response.body.articleId as string },
    })
    expect(article.passwordHash).toMatch(/^scrypt\$/u)
    expect(article.passwordHash).not.toContain('article-reader-password')
    expect(article.revisions).toHaveLength(1)
    expect(article.tags).toHaveLength(1)
    const audit = await prisma.client.auditLog.findFirstOrThrow({
      where: { resourceId: article.id },
    })
    expect(JSON.stringify(audit)).not.toContain('article-reader-password')
    expect(JSON.stringify(audit)).not.toContain(article.passwordHash ?? 'impossible')

    const duplicate = await request(app.getHttpServer())
      .post('/api/v1/admin/articles')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send(body)
    expect(duplicate.status).toBe(409)
    expect(duplicate.body).toMatchObject({ code: 'ARTICLE_SLUG_EXISTS', statusCode: 409 })
  })

  it('updates content, relations and password state with optimistic concurrency', async () => {
    const cookie = await login()
    const created = await createArticle(cookie)
    const tag = await prisma.client.tag.create({
      data: { name: `TypeScript ${randomUUID()}`, slug: `typescript-${randomUUID()}` },
    })
    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/admin/articles/${created.articleId}`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({
        content: 'Updated article content with more words',
        expectedVersion: 1,
        tagIds: [tag.id],
        title: 'Updated command article',
        visibility: 'PUBLIC',
      })
      .expect(200)
    expect(updated.body).toMatchObject({
      articleId: created.articleId,
      passwordProtected: false,
      status: 'DRAFT',
      version: 2,
    })

    const stale = await request(app.getHttpServer())
      .patch(`/api/v1/admin/articles/${created.articleId}`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ expectedVersion: 1, title: 'Stale update' })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'ARTICLE_VERSION_CONFLICT', statusCode: 409 })

    const conflictingPasswordMutation = await request(app.getHttpServer())
      .patch(`/api/v1/admin/articles/${created.articleId}`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ clearPassword: true, expectedVersion: 2, password: 'replacement-password' })
    expect(conflictingPasswordMutation.status).toBe(400)
    expect(conflictingPasswordMutation.body).toMatchObject({
      code: 'ARTICLE_PASSWORD_MUTATION_CONFLICT',
      statusCode: 400,
    })
    await expect(
      prisma.client.articleRevision.count({ where: { articleId: created.articleId } }),
    ).resolves.toBe(2)
  })

  it('schedules, cancels and archives while invalidating stale schedule versions', async () => {
    const cookie = await login()
    const created = await createArticle(cookie)
    const past = await request(app.getHttpServer())
      .post(`/api/v1/admin/articles/${created.articleId}/schedule`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ expectedVersion: 1, scheduledAt: new Date(Date.now() - 60_000).toISOString() })
    expect(past.status).toBe(400)
    expect(past.body).toMatchObject({ code: 'ARTICLE_INVALID_SCHEDULE_TIME', statusCode: 400 })

    const scheduled = await request(app.getHttpServer())
      .post(`/api/v1/admin/articles/${created.articleId}/schedule`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ expectedVersion: 1, scheduledAt: new Date(Date.now() + 3_600_000).toISOString() })
      .expect(200)
    expect(scheduled.body).toMatchObject({ scheduleVersion: 2, status: 'SCHEDULED', version: 2 })
    const scheduledEvent = await prisma.client.outboxEvent.findFirstOrThrow({
      include: { deliveries: true },
      where: { aggregateId: created.articleId, eventName: 'article.publication-scheduled' },
    })
    expect(scheduledEvent.deliveries).toHaveLength(1)
    expect(scheduledEvent.deliveries[0]).toMatchObject({
      consumerKey: 'article.publish-scheduled.v1',
      jobName: 'article.publish-scheduled',
      queueName: 'article-commands',
      status: 'PENDING',
    })
    expect(scheduledEvent.deliveries[0]?.nextAttemptAt.toISOString()).toBe(
      scheduled.body.scheduledAt,
    )
    expect(JSON.stringify(scheduledEvent.payload)).not.toContain('Initial command article content')

    const cancelled = await request(app.getHttpServer())
      .post(`/api/v1/admin/articles/${created.articleId}/cancel-schedule`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ expectedVersion: 2 })
      .expect(200)
    expect(cancelled.body).toMatchObject({
      scheduleVersion: 3,
      scheduledAt: null,
      status: 'DRAFT',
      version: 3,
    })

    const archived = await request(app.getHttpServer())
      .post(`/api/v1/admin/articles/${created.articleId}/archive`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ expectedVersion: 3 })
      .expect(200)
    expect(archived.body).toMatchObject({ status: 'ARCHIVED', version: 4 })
  })

  it('publishes with a revision, audit entry and minimal outbox event in one transaction', async () => {
    const cookie = await login()
    const created = await createArticle(cookie)
    const published = await request(app.getHttpServer())
      .post(`/api/v1/admin/articles/${created.articleId}/publish`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ expectedVersion: 1 })
      .expect(200)
    expect(published.body).toMatchObject({
      articleId: created.articleId,
      publishedAt: expect.any(String),
      revisionId: expect.any(String),
      status: 'PUBLISHED',
      version: 2,
    })

    await expect(
      prisma.client.articleRevision.count({ where: { articleId: created.articleId } }),
    ).resolves.toBe(2)
    const event = await prisma.client.outboxEvent.findFirstOrThrow({
      include: { deliveries: true },
      where: { aggregateId: created.articleId },
    })
    expect(event.eventName).toBe('article.published')
    expect(event.deliveries).toHaveLength(3)
    expect(event.payload).not.toHaveProperty('content')
    await expect(
      prisma.client.auditLog.count({ where: { resourceId: created.articleId } }),
    ).resolves.toBe(2)
  })

  async function login(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send({ identifier: 'command-editor@blog.local', password })
      .expect(200)
    return firstCookie(response.headers['set-cookie'])
  }

  async function createArticle(cookie: string): Promise<{ articleId: string }> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/articles')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send(createBody())
      .expect(201)
    return { articleId: response.body.articleId as string }
  }

  function createBody() {
    return {
      content: 'Initial command article content',
      slug: `command-article-${randomUUID()}`,
      title: 'Command article',
    }
  }

  async function cleanup(): Promise<void> {
    if (!prisma) return
    await prisma.client.$transaction([
      prisma.client.loginSession.deleteMany(),
      prisma.client.outboxDelivery.deleteMany(),
      prisma.client.outboxEvent.deleteMany(),
      prisma.client.auditLog.deleteMany(),
      prisma.client.articleTag.deleteMany(),
      prisma.client.articleRevision.deleteMany(),
      prisma.client.article.deleteMany(),
      prisma.client.media.deleteMany(),
      prisma.client.tag.deleteMany(),
      prisma.client.category.deleteMany(),
      prisma.client.userRole.deleteMany(),
      prisma.client.rolePermission.deleteMany(),
      prisma.client.user.deleteMany(),
      prisma.client.role.deleteMany(),
      prisma.client.permission.deleteMany(),
    ])
  }
})

function firstCookie(value: string | string[] | undefined): string {
  const header = Array.isArray(value) ? value[0] : value
  if (!header) throw new Error('Expected a Set-Cookie response header')
  return header.split(';', 1)[0] ?? ''
}
