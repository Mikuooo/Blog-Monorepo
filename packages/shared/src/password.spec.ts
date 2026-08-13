import { describe, expect, it } from 'vitest'

import { hashPassword, verifyPassword } from './password.js'

describe('password hashing', () => {
  it('hashes and verifies a password without storing its plaintext', async () => {
    const password = 'correct horse battery staple'
    const encoded = await hashPassword(password)

    expect(encoded).not.toContain(password)
    await expect(verifyPassword(password, encoded)).resolves.toBe(true)
    await expect(verifyPassword('incorrect password', encoded)).resolves.toBe(false)
  })

  it('rejects malformed and unsupported hashes', async () => {
    await expect(verifyPassword('password', 'not-a-password-hash')).resolves.toBe(false)
    await expect(
      verifyPassword('password', 'scrypt$1$8$1$YXV0aC1kdW1teS1zYWx0LXYx$YWJj'),
    ).resolves.toBe(false)
  })
})
