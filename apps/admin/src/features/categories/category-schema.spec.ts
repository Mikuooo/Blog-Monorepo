import { describe, expect, it } from 'vitest'

import {
  categoryDefaults,
  categoryFormSchema,
  slugifyCategory,
  toCreateCategory,
  toUpdateCategory,
} from './category-schema'

describe('category form schema', () => {
  it('normalizes create and update payloads', () => {
    const values = categoryFormSchema.parse({
      ...categoryDefaults(),
      description: '  工程内容  ',
      name: '  工程实践  ',
      parentId: '123e4567-e89b-42d3-a456-426614174000',
      slug: 'engineering',
      sortOrder: 10,
    })
    expect(toCreateCategory(values)).toMatchObject({
      description: '工程内容',
      name: '工程实践',
      parentId: '123e4567-e89b-42d3-a456-426614174000',
      slug: 'engineering',
    })
    expect(toUpdateCategory({ ...values, parentId: '' }).parentId).toBeNull()
  })

  it('rejects invalid names and slugs', () => {
    expect(
      categoryFormSchema.safeParse({ ...categoryDefaults(), name: '', slug: 'Invalid Slug' })
        .success,
    ).toBe(false)
  })

  it('generates safe Latin slugs', () => {
    expect(slugifyCategory(' Engineering Notes ')).toBe('engineering-notes')
    expect(slugifyCategory('中文分类')).toBe('')
  })
})
