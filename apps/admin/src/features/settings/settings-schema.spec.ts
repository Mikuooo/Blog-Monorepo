import { describe, expect, it } from 'vitest'

import { settingsFormDefaults, settingsFormSchema, toUpdateSettings } from './settings-schema'

describe('settings form schema', () => {
  it('maps API settings and normalizes duplicate keywords', () => {
    const values = settingsFormDefaults()
    values.seo.keywords = 'TypeScript, CMS\nTypeScript，Engineering'
    expect(settingsFormSchema.safeParse(values).success).toBe(true)
    expect(toUpdateSettings(values).seo.keywords).toEqual(['TypeScript', 'CMS', 'Engineering'])
  })

  it('rejects non-http resource URLs', () => {
    const values = settingsFormDefaults()
    values.basic.logoUrl = 'javascript:alert(1)'
    expect(settingsFormSchema.safeParse(values).success).toBe(false)
  })

  it('enforces bounded page size and keyword count', () => {
    const values = settingsFormDefaults()
    values.content.articlesPerPage = 101
    values.seo.keywords = Array.from({ length: 21 }, (_, index) => `keyword-${index}`).join(',')
    const result = settingsFormSchema.safeParse(values)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map(({ path }) => path.join('.'))).toEqual(
        expect.arrayContaining(['content.articlesPerPage', 'seo.keywords']),
      )
    }
  })
})
