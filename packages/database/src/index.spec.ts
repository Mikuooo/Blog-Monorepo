import { describe, expect, it } from 'vitest'

import { createDatabaseClient } from './index.js'

describe('createDatabaseClient', () => {
  it('rejects an empty connection string before opening a pool', () => {
    expect(() => createDatabaseClient('  ')).toThrow('A PostgreSQL connection string is required')
  })
})
