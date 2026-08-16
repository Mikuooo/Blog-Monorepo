import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createDatabaseClient: vi.fn(() => ({ $disconnect: vi.fn() })),
}))

vi.mock('@blog/database', () => ({
  createDatabaseClient: mocks.createDatabaseClient,
}))

import { ReadonlyPrismaService } from './readonly-prisma.service.js'

describe('ReadonlyPrismaService', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    mocks.createDatabaseClient.mockClear()
  })

  it('uses the dedicated read-only connection when configured', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DATABASE_URL', 'postgresql://runtime.invalid/blog')
    vi.stubEnv('DATABASE_READONLY_URL', ' postgresql://readonly.invalid/blog ')

    new ReadonlyPrismaService()

    expect(mocks.createDatabaseClient).toHaveBeenCalledWith('postgresql://readonly.invalid/blog')
  })

  it('falls back to the runtime connection for isolated test environments', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('DATABASE_URL', 'postgresql://runtime.invalid/blog')
    vi.stubEnv('DATABASE_READONLY_URL', 'postgresql://readonly.invalid/blog')

    new ReadonlyPrismaService()

    expect(mocks.createDatabaseClient).toHaveBeenCalledWith('postgresql://runtime.invalid/blog')
  })
})
