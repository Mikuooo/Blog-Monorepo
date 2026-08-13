import { config as loadEnvironment } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'prisma/config'

const packageDirectory = dirname(fileURLToPath(import.meta.url))
loadEnvironment({ path: resolve(packageDirectory, '../../.env'), quiet: true })

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://blog:blog@localhost:5432/blog_dev?schema=public',
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  schema: 'prisma/schema.prisma',
})
