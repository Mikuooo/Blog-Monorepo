import { config as loadEnvironment } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'prisma/config'

const packageDirectory = dirname(fileURLToPath(import.meta.url))
const rootDirectory = resolve(packageDirectory, '../..')
const environmentFile = process.env.BLOG_ENV_FILE?.trim()
if (environmentFile) {
  loadEnvironment({ path: resolve(rootDirectory, environmentFile), quiet: true })
} else if (process.env.NODE_ENV === 'production') {
  loadEnvironment({ path: resolve(rootDirectory, '.env.production'), quiet: true })
}
loadEnvironment({ path: resolve(packageDirectory, '../../.env'), quiet: true })

export default defineConfig({
  datasource: {
    url:
      process.env.DATABASE_OWNER_URL ??
      process.env.DATABASE_URL ??
      'postgresql://blog:blog@localhost:5432/blog_dev?schema=public',
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  schema: 'prisma/schema.prisma',
})
