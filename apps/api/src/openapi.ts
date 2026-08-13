import 'reflect-metadata'
import './environment.js'

import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  createApplication,
  createInternalOpenApiDocument,
  createPublicOpenApiDocument,
} from './bootstrap.js'

async function generateOpenApiDocuments() {
  process.env.INTERNAL_WORKLOAD_AUDIENCE ??= 'blog-api-internal'
  process.env.INTERNAL_WORKLOAD_ISSUER ??= 'blog-worker'
  process.env.INTERNAL_WORKLOAD_SECRET ??= 'openapi-generation-only-secret-32-bytes'
  process.env.INTERNAL_WORKLOAD_SUBJECT ??= 'apps/worker'
  const app = await createApplication({ disableLogger: true })
  await app.init()

  const outputDirectory = resolve(process.cwd(), 'openapi')
  await mkdir(outputDirectory, { recursive: true })
  await Promise.all([
    writeFile(
      resolve(outputDirectory, 'openapi.json'),
      `${JSON.stringify(createPublicOpenApiDocument(app), null, 2)}\n`,
    ),
    writeFile(
      resolve(outputDirectory, 'openapi.internal.json'),
      `${JSON.stringify(createInternalOpenApiDocument(app), null, 2)}\n`,
    ),
  ])
  await app.close()
}

await generateOpenApiDocuments()
