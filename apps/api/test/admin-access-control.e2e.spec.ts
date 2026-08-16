import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { INestApplication } from '@nestjs/common'

import { hashPassword } from '@blog/shared/password'

import { createApplication } from '../src/bootstrap.js'
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js'

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim()
const describeWithDatabase =
  testDatabaseUrl && new URL(testDatabaseUrl).pathname.endsWith('_test') ? describe : describe.skip

describeWithDatabase('administration access control API', () => {
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
        'article.read',
        'role.create',
        'role.delete',
        'role.read',
        'role.update',
        'user.disable',
        'user.read',
        'user.update',
      ].map((code) => prisma.client.permission.create({ data: { code } })),
    )
    const operatorRole = await prisma.client.role.create({
      data: {
        code: 'ACCESS_ADMIN',
        name: 'Access administrator',
        permissions: {
          createMany: { data: permissions.slice(1).map(({ id }) => ({ permissionId: id })) },
        },
      },
    })
    const superRole = await prisma.client.role.create({
      data: { code: 'SUPER_ADMIN', isSystem: true, name: 'Super administrator' },
    })
    await createUser('operator', 'operator@blog.local', operatorRole.id)
    await createUser('guardian', 'guardian@blog.local', superRole.id)
    await createUser('editor', 'editor@blog.local')
  })

  afterAll(async () => {
    await cleanup()
    await app.close()
  })

  it('requires authenticated users with read permissions', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/users').expect(401)
    const cookie = await login()
    const readPermissions = await prisma.client.permission.findMany({
      where: { code: { in: ['role.read', 'user.read'] } },
    })
    await prisma.client.rolePermission.deleteMany({
      where: { permissionId: { in: readPermissions.map(({ id }) => id) } },
    })
    await request(app.getHttpServer()).get('/api/v1/admin/users').set('Cookie', cookie).expect(403)
    await request(app.getHttpServer()).get('/api/v1/admin/roles').set('Cookie', cookie).expect(403)
  })

  it('lists and safely updates user status and roles', async () => {
    const cookie = await login()
    const operator = await user('operator')
    const guardian = await user('guardian')
    const editor = await user('editor')
    const editorRole = await prisma.client.role.create({ data: { code: 'EDITOR', name: 'Editor' } })

    const list = await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .query({ keyword: 'editor', page: 1, pageSize: 10, status: 'ACTIVE' })
      .set('Cookie', cookie)
      .expect(200)
    expect(list.body).toMatchObject({ page: 1, pageSize: 10, total: 1 })
    expect(list.body.items[0]).not.toHaveProperty('passwordHash')

    const selfDisable = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${operator.id}/status`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ status: 'DISABLED' })
      .expect(409)
    expect(selfDisable.body).toMatchObject({ code: 'USER_SELF_DISABLE' })

    const lastSuperAdmin = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${guardian.id}/status`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ status: 'DISABLED' })
      .expect(409)
    expect(lastSuperAdmin.body).toMatchObject({ code: 'LAST_SUPER_ADMIN' })

    const roles = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${editor.id}/roles`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ roleIds: [editorRole.id] })
      .expect(200)
    expect(roles.body.roles).toEqual([
      expect.objectContaining({ code: 'EDITOR', id: editorRole.id }),
    ])

    const disabled = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${editor.id}/status`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ status: 'DISABLED' })
      .expect(200)
    expect(disabled.body.status).toBe('DISABLED')
    expect(await prisma.client.auditLog.count({ where: { resource: 'user' } })).toBe(2)
  })

  it('manages custom roles while protecting system roles and assignments', async () => {
    const cookie = await login()
    const articleRead = await prisma.client.permission.findUniqueOrThrow({
      where: { code: 'article.read' },
    })
    const permissions = await request(app.getHttpServer())
      .get('/api/v1/admin/roles/permissions')
      .set('Cookie', cookie)
      .expect(200)
    expect(permissions.body).toContainEqual(expect.objectContaining({ code: 'article.read' }))

    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/roles')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({
        code: 'CONTENT_REVIEWER',
        description: 'Reviews content',
        name: 'Content reviewer',
        permissionIds: [articleRead.id],
      })
      .expect(201)
    expect(created.body).toMatchObject({
      code: 'CONTENT_REVIEWER',
      permissions: [expect.objectContaining({ code: 'article.read' })],
    })

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/admin/roles/${created.body.id}`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ name: 'Senior reviewer', permissionIds: [] })
      .expect(200)
    expect(updated.body).toMatchObject({ name: 'Senior reviewer', permissions: [] })

    const editor = await user('editor')
    await prisma.client.userRole.create({ data: { roleId: created.body.id, userId: editor.id } })
    const assigned = await request(app.getHttpServer())
      .delete(`/api/v1/admin/roles/${created.body.id}`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .expect(409)
    expect(assigned.body).toMatchObject({ code: 'ROLE_HAS_USERS' })
    await prisma.client.userRole.deleteMany({ where: { roleId: created.body.id } })
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/roles/${created.body.id}`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .expect(200)

    const systemRole = await prisma.client.role.findUniqueOrThrow({
      where: { code: 'SUPER_ADMIN' },
    })
    const systemPermissions = await request(app.getHttpServer())
      .patch(`/api/v1/admin/roles/${systemRole.id}`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ permissionIds: [] })
      .expect(409)
    expect(systemPermissions.body).toMatchObject({ code: 'ROLE_SYSTEM_PERMISSIONS_FORBIDDEN' })
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/roles/${systemRole.id}`)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .expect(409)
  })

  async function createUser(username: string, email: string, roleId?: string) {
    return prisma.client.user.create({
      data: {
        displayName: username,
        email,
        passwordHash: await hashPassword(password),
        username,
        ...(roleId ? { roles: { create: { roleId } } } : {}),
      },
    })
  }

  async function user(username: string) {
    return prisma.client.user.findUniqueOrThrow({ where: { username } })
  }

  async function login(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send({ identifier: 'operator@blog.local', password })
      .expect(200)
    return firstCookie(response.headers['set-cookie'])
  }

  async function cleanup(): Promise<void> {
    if (!prisma) return
    await prisma.client.$transaction([
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

function firstCookie(value: string | string[] | undefined): string {
  const header = Array.isArray(value) ? value[0] : value
  if (!header) throw new Error('Expected a Set-Cookie response header')
  return header.split(';', 1)[0] ?? ''
}
