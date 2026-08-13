import { dirname, resolve } from 'node:path'
import { loadEnvFile } from 'node:process'
import { fileURLToPath } from 'node:url'

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
try {
  loadEnvFile(resolve(sourceDirectory, '../../../.env'))
} catch (error) {
  if (!(error instanceof Error) || (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}
