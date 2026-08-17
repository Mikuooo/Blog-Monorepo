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

describeWithDatabase('administration taxonomy API', () => {
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
      [
        'article.create',
        'category.create',
        'category.delete',
        'category.read',
        'category.update',
        'tag.create',
        'tag.delete',
        'tag.read',
        'tag.update',
      ].map((code) => prisma.client.permission.create({ data: { code } })),
    )
    const role = await prisma.client.role.create({ data: { code: 'EDITOR', name: 'Editor' } })
    await prisma.client.rolePermission.createMany({
      data: permissions.map((permission) => ({ permissionId: permission.id, roleId: role.id })),
    })
    const user = await prisma.client.user.create({
      data: {
        displayName: 'Taxonomy Editor',
        email: 'taxonomy-editor@blog.local',
        passwordHash: await hashPassword(password),
        username: 'taxonomy-editor',
      },
    })
    await prisma.client.userRole.create({ data: { roleId: role.id, userId: user.id } })
  })

  afterAll(async () => {
    await cleanup()
    await app.close()
  })

  it('requires category and tag read permissions', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/categories').expect(401)
    const cookie = await login()
    await prisma.client.rolePermission.deleteMany({
      where: { permission: { code: { in: ['category.read', 'tag.read'] } } },
    })
    await request(app.getHttpServer())
      .get('/api/v1/admin/categories')
      .set('Cookie', cookie)
      .expect(403)
    await request(app.getHttpServer()).get('/api/v1/admin/tags').set('Cookie', cookie).expect(403)
  })

  it('manages category trees and prevents cycles or deleting parents with children', async () => {
    const cookie = await login()
    const root = await createCategory(cookie, { name: 'Engineering' })
    const child = await createCategory(cookie, {
      name: 'Frontend',
      parentId: root.id,
    })
    const sibling = await createCategory(cookie, { name: 'Backend', parentId: root.id })
    expect(root).toMatchObject({ slug: 'engineering', sortOrder: 0 })
    expect(child).toMatchObject({ slug: 'frontend', sortOrder: 0 })
    expect(sibling).toMatchObject({ slug: 'backend', sortOrder: 1 })

    const list = await request(app.getHttpServer())
      .get('/api/v1/admin/categories')
      .query({ keyword: 'front', page: 1, pageSize: 10 })
      .set('Cookie', cookie)
      .expect(200)
    expect(list.body).toMatchObject({ page: 1, pageSize: 10, total: 1 })
    expect(list.body.items[0]).toMatchObject({ parent: { id: root.id }, slug: 'frontend' })

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/categories/${root.id}`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ parentId: child.id })
      .expect(409)
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/categories/${root.id}`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .expect(409)

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/categories/${child.id}`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ parentId: null })
      .expect(200)
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/categories/${sibling.id}`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ parentId: null })
      .expect(200)
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/categories/${root.id}`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .expect(200)
    expect(
      await prisma.client.category.findUniqueOrThrow({ where: { id: root.id } }),
    ).toMatchObject({
      deletedAt: expect.any(Date),
    })
  })

  it('manages tags, enforces uniqueness, and reports removed article links', async () => {
    const cookie = await login()
    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/tags')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ description: 'Database content', name: 'PostgreSQL', slug: 'postgresql' })
      .expect(201)
    await request(app.getHttpServer())
      .post('/api/v1/admin/tags')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ name: 'PostgreSQL', slug: 'postgresql-2' })
      .expect(409)

    const user = await prisma.client.user.findUniqueOrThrow({
      where: { username: 'taxonomy-editor' },
    })
    await prisma.client.article.create({
      data: {
        authorId: user.id,
        content: 'Database content',
        slug: `database-${randomUUID()}`,
        tags: { create: { tagId: created.body.id } },
        title: 'Database article',
      },
    })

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/admin/tags/${created.body.id}`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ name: 'Postgres' })
      .expect(200)
    expect(updated.body).toMatchObject({ articleCount: 1, name: 'Postgres' })

    const removed = await request(app.getHttpServer())
      .delete(`/api/v1/admin/tags/${created.body.id}`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .expect(200)
    expect(removed.body).toEqual({ articleCount: 1, id: created.body.id })
    expect(await prisma.client.articleTag.count()).toBe(0)
  })

  async function createCategory(
    cookie: string,
    body: { name: string; parentId?: string; slug?: string },
  ): Promise<{ id: string; slug: string; sortOrder: number }> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/categories')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send(body)
      .expect(201)
    return response.body as { id: string; slug: string; sortOrder: number }
  }

  async function login(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send({ identifier: 'taxonomy-editor@blog.local', password })
      .expect(200)
    return firstCookie(response.headers['set-cookie'])
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
      prisma.client.auditLog.deleteMany(),
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
