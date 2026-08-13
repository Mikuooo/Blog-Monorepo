import { describe, expect, it } from 'vitest'

import { signWorkloadToken, verifyWorkloadToken } from './workload-token.js'

const secret = 'a-secure-test-secret-with-32-bytes'
const expected = { aud: 'blog-api-internal', iss: 'blog-worker', sub: 'apps/worker' }

describe('workload token', () => {
  it('signs and verifies required workload claims', () => {
    const token = signWorkloadToken(
      { ...expected, scope: 'article.publish-scheduled' },
      secret,
      60,
      100,
    )
    expect(verifyWorkloadToken(token, expected, secret, 120)).toMatchObject({
      ...expected,
      exp: 160,
      iat: 100,
      scope: 'article.publish-scheduled',
    })
  })

  it('rejects tampering, expiry and wrong audience', () => {
    const token = signWorkloadToken(
      { ...expected, scope: 'article.publish-scheduled' },
      secret,
      60,
      100,
    )
    expect(() => verifyWorkloadToken(`${token}x`, expected, secret, 120)).toThrow()
    expect(() => verifyWorkloadToken(token, expected, secret, 160)).toThrow()
    expect(() => verifyWorkloadToken(token, { ...expected, aud: 'wrong' }, secret, 120)).toThrow()
  })

  it('rejects tokens whose lifetime exceeds the workload-token limit', () => {
    const token = signWorkloadToken(
      { ...expected, scope: 'article.publish-scheduled' },
      secret,
      121,
      100,
    )

    expect(() => verifyWorkloadToken(token, expected, secret, 101)).toThrow()
  })
})
