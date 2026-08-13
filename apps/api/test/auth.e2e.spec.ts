import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { INestApplication } from '@nestjs/common'

import { hashPassword } from '@blog/shared/password'

import { createApplication } from '../src/bootstrap.js'
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js'

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim()
const describeWithDatabase =
  testDatabaseUrl && new URL(testDatabaseUrl).pathname.endsWith('_test') ? describe : describe.skip

describeWithDatabase('administration authentication API', () => {
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
    const role = await prisma.client.role.create({ data: { code: 'ADMIN', name: 'Administrator' } })
    await prisma.client.rolePermission.create({
      data: { permissionId: permission.id, roleId: role.id },
    })
    const user = await prisma.client.user.create({
      data: {
        displayName: 'Test Administrator',
        email: 'admin@blog.local',
        passwordHash: await hashPassword(password),
        username: 'admin',
      },
    })
    await prisma.client.userRole.create({ data: { roleId: role.id, userId: user.id } })
  })

  afterAll(async () => {
    await cleanup()
    await app.close()
  })

  it('rejects unknown, incorrect and disabled credentials with one stable error', async () => {
    for (const credentials of [
      { identifier: 'missing@blog.local', password },
      { identifier: 'admin@blog.local', password: 'incorrect' },
    ]) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Origin', origin)
        .send(credentials)
      expect(response.status).toBe(401)
      expect(response.body).toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 })
    }

    await prisma.client.user.update({ data: { status: 'DISABLED' }, where: { username: 'admin' } })
    const disabled = await login()
    expect(disabled.status).toBe(401)
    expect(disabled.body).toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 })
  })

  it('creates a hashed server-side session, resolves it, and revokes it on logout', async () => {
    const loggedIn = await login().expect(200)
    expect(loggedIn.body).toMatchObject({
      user: {
        email: 'admin@blog.local',
        permissions: ['article.read'],
        roles: ['ADMIN'],
        username: 'admin',
      },
    })
    expect(loggedIn.body).not.toHaveProperty('sessionToken')

    const cookie = firstCookie(loggedIn.headers['set-cookie'])
    expect(cookie).toMatch(/^blog_session=/u)
    const rawToken = cookie.slice(cookie.indexOf('=') + 1)
    const persisted = await prisma.client.loginSession.findFirstOrThrow()
    expect(persisted.tokenHash).toMatch(/^[a-f0-9]{64}$/u)
    expect(persisted.tokenHash).not.toBe(rawToken)

    const current = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie)
      .expect(200)
    expect(current.body).toMatchObject({ username: 'admin', permissions: ['article.read'] })

    const loggedOut = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .expect(200)
    expect(loggedOut.body).toEqual({ success: true })
    expect(firstCookie(loggedOut.headers['set-cookie'])).toBe('blog_session=')
    await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', cookie).expect(401)
    await expect(
      prisma.client.loginSession.findFirstOrThrow({ select: { revokedAt: true } }),
    ).resolves.toMatchObject({ revokedAt: expect.any(Date) })
  })

  it('rejects browser requests from an untrusted origin', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', 'https://attacker.invalid')
      .send({ identifier: 'admin@blog.local', password })
    expect(response.status).toBe(403)
    expect(response.body).toMatchObject({ code: 'UNTRUSTED_ORIGIN', statusCode: 403 })
  })

  function login() {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send({ identifier: 'admin@blog.local', password })
  }

  async function cleanup(): Promise<void> {
    if (!prisma) return
    await prisma.client.$transaction([
      prisma.client.loginSession.deleteMany(),
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
