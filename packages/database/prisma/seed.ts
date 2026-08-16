import 'dotenv/config'

import { PrismaPg } from '@prisma/adapter-pg'

import { hashPassword } from '@blog/shared/password'

import { PrismaClient } from '../src/generated/prisma/client.js'

const databaseUrl = process.env.DATABASE_OWNER_URL?.trim() || process.env.DATABASE_URL?.trim()
if (!databaseUrl) {
  throw new Error('DATABASE_OWNER_URL or DATABASE_URL is required for database seeding')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
})

const roles = [
  { code: 'SUPER_ADMIN', name: 'Super administrator' },
  { code: 'ADMIN', name: 'Administrator' },
  { code: 'EDITOR', name: 'Editor' },
] as const

const permissions = [
  'dashboard.read',
  'article.read',
  'article.create',
  'article.update',
  'article.delete',
  'article.publish',
  'category.read',
  'category.create',
  'category.update',
  'category.delete',
  'tag.read',
  'tag.create',
  'tag.update',
  'tag.delete',
  'comment.read',
  'comment.audit',
  'comment.delete',
  'media.read',
  'media.upload',
  'media.delete',
  'page.read',
  'page.create',
  'page.update',
  'page.delete',
  'user.read',
  'user.create',
  'user.update',
  'user.disable',
  'role.read',
  'role.create',
  'role.update',
  'role.delete',
  'setting.read',
  'setting.update',
  'audit.read',
  'analytics.read',
  'ai.generate',
] as const

async function seed(): Promise<void> {
  await prisma.user.upsert({
    create: {
      displayName: 'Article Scheduler',
      email: 'article-scheduler@internal.invalid',
      passwordHash: '!service-identity-no-interactive-login',
      status: 'DISABLED',
      username: 'article-scheduler',
    },
    update: { displayName: 'Article Scheduler', status: 'DISABLED' },
    where: { username: 'article-scheduler' },
  })

  const seededRoles = await Promise.all(
    roles.map((role) =>
      prisma.role.upsert({
        create: { ...role, isSystem: true },
        update: { name: role.name, isSystem: true },
        where: { code: role.code },
      }),
    ),
  )

  const seededPermissions = await Promise.all(
    permissions.map((code) =>
      prisma.permission.upsert({
        create: { code },
        update: {},
        where: { code },
      }),
    ),
  )

  const superAdmin = seededRoles.find((role) => role.code === 'SUPER_ADMIN')
  if (!superAdmin) throw new Error('SUPER_ADMIN role was not created')

  await prisma.rolePermission.createMany({
    data: seededPermissions.map((permission) => ({
      permissionId: permission.id,
      roleId: superAdmin.id,
    })),
    skipDuplicates: true,
  })

  const adminPassword = process.env.SEED_ADMIN_PASSWORD?.trim()
  if (adminPassword) {
    if (adminPassword.length < 12 || adminPassword.length > 128) {
      throw new Error('SEED_ADMIN_PASSWORD must contain between 12 and 128 characters')
    }
    const admin = await prisma.user.upsert({
      create: {
        displayName: process.env.SEED_ADMIN_DISPLAY_NAME?.trim() || 'Local Administrator',
        email: process.env.SEED_ADMIN_EMAIL?.trim() || 'admin@blog.local',
        passwordHash: await hashPassword(adminPassword),
        status: 'ACTIVE',
        username: process.env.SEED_ADMIN_USERNAME?.trim() || 'admin',
      },
      update: {
        displayName: process.env.SEED_ADMIN_DISPLAY_NAME?.trim() || 'Local Administrator',
        passwordHash: await hashPassword(adminPassword),
        status: 'ACTIVE',
      },
      where: { username: process.env.SEED_ADMIN_USERNAME?.trim() || 'admin' },
    })
    await prisma.userRole.upsert({
      create: { roleId: superAdmin.id, userId: admin.id },
      update: {},
      where: { userId_roleId: { roleId: superAdmin.id, userId: admin.id } },
    })
  }
}

try {
  await seed()
} finally {
  await prisma.$disconnect()
}
