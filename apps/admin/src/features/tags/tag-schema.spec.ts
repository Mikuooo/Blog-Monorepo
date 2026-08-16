import { describe, expect, it } from 'vitest'

import { slugifyTag, tagDefaults, tagFormSchema, toCreateTag } from './tag-schema'

describe('tag form schema', () => {
  it('normalizes create payloads', () => {
    const values = tagFormSchema.parse({
      description: '  数据库内容  ',
      name: '  PostgreSQL  ',
      slug: 'postgresql',
    })
    expect(toCreateTag(values)).toEqual({
      description: '数据库内容',
      name: 'PostgreSQL',
      slug: 'postgresql',
    })
  })
  it('rejects empty names and unsafe slugs', () => {
    expect(
      tagFormSchema.safeParse({ ...tagDefaults(), name: '', slug: 'Invalid Slug' }).success,
    ).toBe(false)
  })
  it('generates safe Latin slugs', () => {
    expect(slugifyTag(' React Query ')).toBe('react-query')
    expect(slugifyTag('中文标签')).toBe('')
  })
})
