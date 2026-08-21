import { describe, expect, it } from 'vitest'

import {
  articleFormDefaults,
  articleFormSchema,
  slugifyTitle,
  toCreateArticleRequest,
} from './article-schema'

describe('article form schema', () => {
  it('normalizes a complete form into the create-article contract', () => {
    const values = articleFormSchema.parse({
      ...articleFormDefaults,
      content: '  # 正文  ',
      slug: 'delivery-loop',
      summary: '  摘要  ',
      tagIds: ['123e4567-e89b-42d3-a456-426614174000', '123e4567-e89b-42d3-a456-426614174000'],
      title: '  交付闭环  ',
    })

    expect(toCreateArticleRequest(values)).toEqual({
      allowComment: true,
      content: '# 正文',
      isFeatured: false,
      isPinned: false,
      slug: 'delivery-loop',
      summary: '摘要',
      tagIds: ['123e4567-e89b-42d3-a456-426614174000'],
      title: '交付闭环',
      visibility: 'PUBLIC',
    })
  })

  it('requires an eight-character password only for password visibility', () => {
    const base = {
      ...articleFormDefaults,
      content: 'content',
      slug: 'protected-post',
      title: 'Protected post',
    }

    expect(
      articleFormSchema.safeParse({ ...base, password: 'short', visibility: 'PASSWORD' }).success,
    ).toBe(false)
    expect(articleFormSchema.safeParse({ ...base, visibility: 'PRIVATE' }).success).toBe(true)
  })

  it('rejects invalid slugs, URLs, and relation identifiers', () => {
    const result = articleFormSchema.safeParse({
      ...articleFormDefaults,
      canonicalUrl: 'javascript:alert(1)',
      categoryId: 'not-a-uuid',
      content: 'content',
      slug: 'Invalid Slug',
      title: 'Invalid article',
    })

    expect(result.success).toBe(false)
  })

  it('accepts UUIDv7 category ids returned by the database', () => {
    const result = articleFormSchema.safeParse({
      ...articleFormDefaults,
      categoryId: '0192c2a5-7b6d-7abc-8def-0123456789ab',
      content: '正文',
      slug: 'uuidv7-category',
      title: 'UUIDv7 分类',
    })
    expect(result.success).toBe(true)
  })

  it('generates safe slugs for Latin titles without guessing Chinese transliteration', () => {
    expect(slugifyTitle('  Hello, Delivery Loop!  ')).toBe('hello-delivery-loop')
    expect(slugifyTitle('中文标题')).toBe('')
  })
})
