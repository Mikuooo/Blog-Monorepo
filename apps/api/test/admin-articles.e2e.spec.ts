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

describeWithDatabase('administration article query API', () => {
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
    const permission = await prisma.client.permission.create({ data: { code: 'article.read' } })
    const role = await prisma.client.role.create({ data: { code: 'EDITOR', name: 'Editor' } })
    await prisma.client.rolePermission.create({
      data: { permissionId: permission.id, roleId: role.id },
    })
    const user = await prisma.client.user.create({
      data: {
        displayName: 'Article Editor',
        email: 'editor@blog.local',
        passwordHash: await hashPassword(password),
        username: 'editor',
      },
    })
    await prisma.client.userRole.create({ data: { roleId: role.id, userId: user.id } })
  })

  afterAll(async () => {
    await cleanup()
    await app.close()
  })

  it('requires an authenticated identity with article.read', async () => {
    const unauthenticated = await request(app.getHttpServer()).get('/api/v1/admin/articles')
    expect(unauthenticated.status).toBe(401)
    expect(unauthenticated.body).toMatchObject({
      code: 'AUTHENTICATION_REQUIRED',
      statusCode: 401,
    })

    const cookie = await login()
    await prisma.client.rolePermission.deleteMany()
    const forbidden = await request(app.getHttpServer())
      .get('/api/v1/admin/articles')
      .set('Cookie', cookie)
    expect(forbidden.status).toBe(403)
    expect(forbidden.body).toMatchObject({ code: 'PERMISSION_DENIED', statusCode: 403 })
  })

  it('returns bounded filtered pages without loading article content', async () => {
    const cookie = await login()
    const author = await prisma.client.user.findUniqueOrThrow({ where: { username: 'editor' } })
    const category = await prisma.client.category.create({
      data: { name: 'Engineering', slug: 'engineering' },
    })
    const otherCategory = await prisma.client.category.create({
      data: { name: 'Product', slug: 'product' },
    })

    await Promise.all([
      createArticle(author.id, category.id, 'PUBLISHED', 'Platform architecture', 42n),
      createArticle(author.id, category.id, 'DRAFT', 'Platform implementation', 7n),
      createArticle(author.id, otherCategory.id, 'ARCHIVED', 'Retired product note', 3n),
      createArticle(author.id, category.id, 'PUBLISHED', 'Deleted platform note', 100n, new Date()),
    ])

    const firstPage = await request(app.getHttpServer())
      .get('/api/v1/admin/articles')
      .query({ categoryId: category.id, keyword: 'platform', page: 1, pageSize: 1 })
      .set('Cookie', cookie)
      .expect(200)
    expect(firstPage.body).toMatchObject({ page: 1, pageSize: 1, total: 2, totalPages: 2 })
    expect(firstPage.body.items).toHaveLength(1)
    expect(firstPage.body.items[0]).not.toHaveProperty('content')
    expect(firstPage.body.items[0].viewCount).toMatch(/^\d+$/u)

    const published = await request(app.getHttpServer())
      .get('/api/v1/admin/articles')
      .query({ categoryId: category.id, keyword: 'platform', status: 'PUBLISHED' })
      .set('Cookie', cookie)
      .expect(200)
    expect(published.body).toMatchObject({ total: 1 })
    expect(published.body.items[0]).toMatchObject({
      category: { name: 'Engineering' },
      status: 'PUBLISHED',
      title: 'Platform architecture',
      viewCount: '42',
    })

    await request(app.getHttpServer())
      .get('/api/v1/admin/articles')
      .query({ status: 'IN_REVIEW' })
      .set('Cookie', cookie)
      .expect(400)
  })

  it('returns an editable detail without exposing password hashes or deleted articles', async () => {
    const cookie = await login()
    const author = await prisma.client.user.findUniqueOrThrow({ where: { username: 'editor' } })
    const category = await prisma.client.category.create({
      data: { name: 'Database', slug: 'database' },
    })
    const tag = await prisma.client.tag.create({ data: { name: 'PostgreSQL', slug: 'postgresql' } })
    const article = await prisma.client.article.create({
      data: {
        allowComment: false,
        authorId: author.id,
        categoryId: category.id,
        content: '# Transaction boundaries',
        contentHtml: '<h1>Transaction boundaries</h1>',
        passwordHash: 'not-returned-to-clients',
        slug: `transaction-${randomUUID()}`,
        status: 'DRAFT',
        summary: 'A database article',
        tags: { create: { tagId: tag.id } },
        title: 'Transaction boundaries',
        version: 3,
        visibility: 'PASSWORD',
      },
    })

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/admin/articles/${article.id}`)
      .set('Cookie', cookie)
      .expect(200)
    expect(detail.body).toMatchObject({
      allowComment: false,
      category: { name: 'Database' },
      content: '# Transaction boundaries',
      passwordProtected: true,
      tags: [{ name: 'PostgreSQL' }],
      version: 3,
      visibility: 'PASSWORD',
    })
    expect(detail.body).not.toHaveProperty('passwordHash')

    await prisma.client.article.update({
      data: { deletedAt: new Date() },
      where: { id: article.id },
    })
    const deleted = await request(app.getHttpServer())
      .get(`/api/v1/admin/articles/${article.id}`)
      .set('Cookie', cookie)
    expect(deleted.status).toBe(404)
    expect(deleted.body).toMatchObject({ code: 'ARTICLE_NOT_FOUND', statusCode: 404 })

    const missing = await request(app.getHttpServer())
      .get(`/api/v1/admin/articles/${randomUUID()}`)
      .set('Cookie', cookie)
    expect(missing.status).toBe(404)
    expect(missing.body).toMatchObject({ code: 'ARTICLE_NOT_FOUND', statusCode: 404 })
  })

  async function login(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send({ identifier: 'editor@blog.local', password })
      .expect(200)
    return firstCookie(response.headers['set-cookie'])
  }

  async function createArticle(
    authorId: string,
    categoryId: string,
    status: 'ARCHIVED' | 'DRAFT' | 'PUBLISHED',
    title: string,
    viewCount: bigint,
    deletedAt?: Date,
  ) {
    return prisma.client.article.create({
      data: {
        authorId,
        categoryId,
        content: `Content for ${title}`,
        ...(deletedAt ? { deletedAt } : {}),
        slug: `${title.toLowerCase().replaceAll(' ', '-')}-${randomUUID()}`,
        status,
        title,
        viewCount,
      },
    })
  }

  async function cleanup(): Promise<void> {
    if (!prisma) return
    await prisma.client.$transaction([
      prisma.client.loginSession.deleteMany(),
      prisma.client.articleTag.deleteMany(),
      prisma.client.articleRevision.deleteMany(),
      prisma.client.article.deleteMany(),
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
