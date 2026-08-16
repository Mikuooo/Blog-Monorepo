import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { INestApplication } from '@nestjs/common'

import { hashPassword } from '@blog/shared/password'

import { createApplication } from '../src/bootstrap.js'
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js'

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim()
const describeWithDatabase =
  testDatabaseUrl && new URL(testDatabaseUrl).pathname.endsWith('_test') ? describe : describe.skip

describeWithDatabase('administration system settings API', () => {
  const origin = 'http://localhost:3002'
  const password = 'test-settings-administrator-password'
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
      ['setting.read', 'setting.update'].map((code) =>
        prisma.client.permission.create({ data: { code } }),
      ),
    )
    const role = await prisma.client.role.create({
      data: {
        code: 'SETTINGS_ADMIN',
        name: 'Settings administrator',
        permissions: {
          createMany: { data: permissions.map(({ id }) => ({ permissionId: id })) },
        },
      },
    })
    await prisma.client.user.create({
      data: {
        displayName: 'Settings administrator',
        email: 'settings-admin@blog.local',
        passwordHash: await hashPassword(password),
        roles: { create: { roleId: role.id } },
        username: 'settings-admin',
      },
    })
  })

  afterAll(async () => {
    await cleanup()
    await app.close()
  })

  it('requires authentication and the matching read or update permission', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/settings').expect(401)
    const cookie = await login()
    await removePermission('setting.read')
    await request(app.getHttpServer())
      .get('/api/v1/admin/settings')
      .set('Cookie', cookie)
      .expect(403)

    await restorePermission('setting.read')
    await removePermission('setting.update')
    await request(app.getHttpServer())
      .put('/api/v1/admin/settings')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send(validSettings)
      .expect(403)
  })

  it('returns safe defaults without creating database records', async () => {
    const cookie = await login()
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/settings')
      .set('Cookie', cookie)
      .expect(200)

    expect(response.body).toEqual({
      basic: {
        faviconUrl: '',
        logoUrl: '',
        siteDescription: '',
        siteName: 'Blog Platform',
        siteUrl: '',
      },
      content: {
        articlesPerPage: 10,
        commentsEnabled: true,
        defaultArticleStatus: 'DRAFT',
      },
      seo: { defaultDescription: '', defaultTitle: '', keywords: [] },
      updatedAt: null,
    })
    expect(await prisma.client.setting.count()).toBe(0)
  })

  it('validates, persists and audits the fixed settings contract', async () => {
    const cookie = await login()
    await request(app.getHttpServer())
      .put('/api/v1/admin/settings')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ ...validSettings, basic: { ...validSettings.basic, siteUrl: 'javascript:alert(1)' } })
      .expect(400)
    await request(app.getHttpServer())
      .put('/api/v1/admin/settings')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ ...validSettings, basic: { ...validSettings.basic, siteName: '   ' } })
      .expect(400)
    expect(await prisma.client.setting.count()).toBe(0)

    const updated = await request(app.getHttpServer())
      .put('/api/v1/admin/settings')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send(validSettings)
      .expect(200)
    expect(updated.body).toMatchObject(validSettings)
    expect(updated.body.updatedAt).toEqual(expect.any(String))

    const stored = await prisma.client.setting.findMany({ orderBy: { key: 'asc' } })
    expect(stored).toHaveLength(11)
    expect(stored.find(({ key }) => key === 'content.articles_per_page')).toMatchObject({
      type: 'NUMBER',
      value: 20,
    })
    expect(stored.find(({ key }) => key === 'seo.keywords')).toMatchObject({
      type: 'JSON',
      value: ['typescript', 'cms'],
    })
    const audit = await prisma.client.auditLog.findFirstOrThrow({
      where: { action: 'settings.update', resource: 'settings', resourceId: 'system' },
    })
    expect(audit.before).toEqual({})
    expect(audit.after).toMatchObject({ 'site.name': 'Example Blog' })

    const loaded = await request(app.getHttpServer())
      .get('/api/v1/admin/settings')
      .set('Cookie', cookie)
      .expect(200)
    expect(loaded.body).toEqual(updated.body)
  })

  async function login(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send({ identifier: 'settings-admin@blog.local', password })
      .expect(200)
    return firstCookie(response.headers['set-cookie'])
  }

  async function removePermission(code: string): Promise<void> {
    const permission = await prisma.client.permission.findUniqueOrThrow({ where: { code } })
    await prisma.client.rolePermission.deleteMany({ where: { permissionId: permission.id } })
  }

  async function restorePermission(code: string): Promise<void> {
    const permission = await prisma.client.permission.findUniqueOrThrow({ where: { code } })
    const role = await prisma.client.role.findUniqueOrThrow({ where: { code: 'SETTINGS_ADMIN' } })
    await prisma.client.rolePermission.create({
      data: { permissionId: permission.id, roleId: role.id },
    })
  }

  async function cleanup(): Promise<void> {
    if (!prisma) return
    await prisma.client.$transaction([
      prisma.client.setting.deleteMany(),
      prisma.client.loginSession.deleteMany(),
      prisma.client.auditLog.deleteMany(),
      prisma.client.userRole.deleteMany(),
      prisma.client.rolePermission.deleteMany(),
      prisma.client.user.deleteMany(),
      prisma.client.role.deleteMany(),
      prisma.client.permission.deleteMany(),
    ])
  }
})

const validSettings = {
  basic: {
    faviconUrl: 'https://example.com/favicon.ico',
    logoUrl: 'https://example.com/logo.svg',
    siteDescription: 'A practical engineering blog.',
    siteName: 'Example Blog',
    siteUrl: 'https://example.com',
  },
  content: {
    articlesPerPage: 20,
    commentsEnabled: false,
    defaultArticleStatus: 'DRAFT',
  },
  seo: {
    defaultDescription: 'Practical engineering notes.',
    defaultTitle: 'Example Blog',
    keywords: ['typescript', 'cms'],
  },
} as const

function firstCookie(value: string | string[] | undefined): string {
  const header = Array.isArray(value) ? value[0] : value
  if (!header) throw new Error('Expected a Set-Cookie response header')
  return header.split(';', 1)[0] ?? ''
}
