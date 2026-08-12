import { describe, expect, it } from 'vitest'

import { toSlug } from './index.js'

describe('toSlug', () => {
  it('normalizes spaces and punctuation', () => {
    expect(toSlug(' Hello, Blog Platform! ')).toBe('hello-blog-platform')
  })
})
