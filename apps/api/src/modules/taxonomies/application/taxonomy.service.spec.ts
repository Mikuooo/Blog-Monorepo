import { describe, expect, it } from 'vitest'

import { generateTaxonomySlug } from './taxonomy.service.js'

describe('taxonomy slug generation', () => {
  it('generates a readable slug from a Latin name', () => {
    expect(generateTaxonomySlug(' Engineering Notes ', 'category')).toBe('engineering-notes')
  })

  it('uses a stable resource prefix when the name has no ASCII slug characters', () => {
    expect(generateTaxonomySlug('中文分类', 'category')).toMatch(
      /^category-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    )
    expect(generateTaxonomySlug('中文标签', 'tag')).toMatch(
      /^tag-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    )
  })
})
