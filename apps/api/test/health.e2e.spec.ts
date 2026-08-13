import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { INestApplication } from '@nestjs/common'

import { signWorkloadToken } from '@blog/shared/workload-token'

import { createApplication } from '../src/bootstrap.js'

describe('health endpoints', () => {
  let app: INestApplication
  const workloadSecret = 'a-secure-test-secret-with-32-bytes'

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused'
    process.env.INTERNAL_WORKLOAD_AUDIENCE = 'blog-api-internal'
    process.env.INTERNAL_WORKLOAD_ISSUER = 'blog-worker'
    process.env.INTERNAL_WORKLOAD_SECRET = workloadSecret
    process.env.INTERNAL_WORKLOAD_SUBJECT = 'apps/worker'
    app = await createApplication({ disableLogger: true })
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('exposes public liveness', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200)
    expect(response.body).toEqual({ service: 'api', status: 'ok' })
  })

  it('rejects an unauthenticated internal request', async () => {
    await request(app.getHttpServer()).get('/api/v1/internal/health').expect(401)
  })

  it('accepts the configured workload token', async () => {
    const token = signWorkloadToken(
      {
        aud: 'blog-api-internal',
        iss: 'blog-worker',
        scope: 'article.publish-scheduled',
        sub: 'apps/worker',
      },
      workloadSecret,
    )
    await request(app.getHttpServer())
      .get('/api/v1/internal/health')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
  })

  it('rejects a valid token without the required scope', async () => {
    const token = signWorkloadToken(
      { aud: 'blog-api-internal', iss: 'blog-worker', scope: 'system.health', sub: 'apps/worker' },
      workloadSecret,
    )
    await request(app.getHttpServer())
      .get('/api/v1/internal/health')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })
})
