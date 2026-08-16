import { describe, expect, it } from 'vitest'

import { loginSchema, resolvePostLoginPath } from './auth-schema'

describe('login input and navigation safety', () => {
  it('trims identifiers and requires a password', () => {
    expect(
      loginSchema.parse({ identifier: '  admin@blog.local  ', password: 'correct-password' }),
    ).toEqual({ identifier: 'admin@blog.local', password: 'correct-password' })
    expect(loginSchema.safeParse({ identifier: 'admin', password: '' }).success).toBe(false)
  })

  it('allows internal return paths and rejects open redirects', () => {
    expect(resolvePostLoginPath('/articles?page=2')).toBe('/articles?page=2')
    expect(resolvePostLoginPath('https://attacker.invalid/steal')).toBe('/dashboard')
    expect(resolvePostLoginPath('//attacker.invalid/steal')).toBe('/dashboard')
    expect(resolvePostLoginPath(null)).toBe('/dashboard')
  })
})
