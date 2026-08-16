import { dirname, resolve } from 'node:path'
import { loadEnvFile } from 'node:process'
import { fileURLToPath } from 'node:url'

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const rootDirectory = resolve(sourceDirectory, '../../..')

const environmentFile =
  process.env.BLOG_ENV_FILE?.trim() ||
  (process.env.NODE_ENV === 'production' ? '.env.production' : undefined)
if (environmentFile) {
  try {
    loadEnvFile(resolve(rootDirectory, environmentFile))
  } catch (error) {
    if (!(error instanceof Error) || (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}
try {
  loadEnvFile(resolve(rootDirectory, '.env'))
} catch (error) {
  if (!(error instanceof Error) || (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}
