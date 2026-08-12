import { describe, expect, it } from 'vitest'

import { loadWorkerConfiguration } from '../src/config.js'

describe('loadWorkerConfiguration', () => {
  it('loads bounded defaults', () => {
    expect(loadWorkerConfiguration({ REDIS_URL: 'redis://localhost:6379' })).toEqual({
      concurrency: 4,
      healthPort: 3003,
      redisUrl: 'redis://localhost:6379',
    })
  })

  it('rejects a non-Redis URL', () => {
    expect(() => loadWorkerConfiguration({ REDIS_URL: 'https://localhost' })).toThrow(
      'REDIS_URL must use redis:// or rediss://',
    )
  })
})
