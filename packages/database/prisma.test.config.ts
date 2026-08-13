import { config as loadEnvironment } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'prisma/config'

const packageDirectory = dirname(fileURLToPath(import.meta.url))
loadEnvironment({ path: resolve(packageDirectory, '../../.env'), quiet: true })

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgresql://blog:blog@localhost:5432/blog_test?schema=public'
if (!new URL(testDatabaseUrl).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL must target a database whose name ends with _test')
}

export default defineConfig({
  datasource: { url: testDatabaseUrl },
  migrations: { path: 'prisma/migrations' },
  schema: 'prisma/schema.prisma',
})
