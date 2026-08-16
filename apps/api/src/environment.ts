import { config as loadEnvironment } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const rootDirectory = resolve(sourceDirectory, '../../..')
const environmentFile = process.env.BLOG_ENV_FILE?.trim()
if (environmentFile) {
  loadEnvironment({ path: resolve(rootDirectory, environmentFile), quiet: true })
} else if (process.env.NODE_ENV === 'production') {
  loadEnvironment({ path: resolve(rootDirectory, '.env.production'), quiet: true })
}
loadEnvironment({ path: resolve(sourceDirectory, '../../../.env'), quiet: true })

export function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}
