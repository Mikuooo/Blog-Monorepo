import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { INestApplication } from '@nestjs/common'

import { createApplication } from '../src/bootstrap.js'

describe('health endpoints', () => {
  let app: INestApplication

  beforeAll(async () => {
    process.env.INTERNAL_API_TOKEN = 'test-workload-token'
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
    await request(app.getHttpServer())
      .get('/api/v1/internal/health')
      .set('Authorization', 'Bearer test-workload-token')
      .expect(200)
  })
})
