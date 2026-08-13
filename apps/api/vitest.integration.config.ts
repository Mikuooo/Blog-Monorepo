import { config as loadEnvironment } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const applicationDirectory = dirname(fileURLToPath(import.meta.url))
loadEnvironment({ path: resolve(applicationDirectory, '../../.env'), quiet: true })

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim()
if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required for API integration tests')
}
if (!new URL(testDatabaseUrl).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL must target a database whose name ends with _test')
}

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    maxWorkers: 1,
  },
})
