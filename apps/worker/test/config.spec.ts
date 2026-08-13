import { describe, expect, it } from 'vitest'

import { loadWorkerConfiguration } from '../src/config.js'

describe('loadWorkerConfiguration', () => {
  const required = {
    INTERNAL_API_BASE_URL: 'http://localhost:3001',
    INTERNAL_WORKLOAD_AUDIENCE: 'blog-api-internal',
    INTERNAL_WORKLOAD_ISSUER: 'blog-worker',
    INTERNAL_WORKLOAD_SECRET: 'a-secure-test-secret-with-32-bytes',
    INTERNAL_WORKLOAD_SUBJECT: 'apps/worker',
    REDIS_URL: 'redis://localhost:6379',
  }

  it('loads bounded defaults', () => {
    expect(loadWorkerConfiguration(required)).toEqual({
      concurrency: 4,
      healthPort: 3003,
      internalApiAudience: 'blog-api-internal',
      internalApiBaseUrl: 'http://localhost:3001',
      internalApiIssuer: 'blog-worker',
      internalApiSecret: 'a-secure-test-secret-with-32-bytes',
      internalApiSubject: 'apps/worker',
      redisUrl: 'redis://localhost:6379',
    })
  })

  it('rejects a non-Redis URL', () => {
    expect(() => loadWorkerConfiguration({ ...required, REDIS_URL: 'https://localhost' })).toThrow(
      'REDIS_URL must use redis:// or rediss://',
    )
  })

  it('rejects an internal API URL that already contains the route prefix', () => {
    expect(() =>
      loadWorkerConfiguration({
        ...required,
        INTERNAL_API_BASE_URL: 'http://localhost:3001/api/v1/internal',
      }),
    ).toThrow('INTERNAL_API_BASE_URL must contain only the API origin without a path')
  })
})
