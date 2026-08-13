import { createHmac, timingSafeEqual } from 'node:crypto'

export type WorkloadTokenClaims = {
  aud: string
  exp: number
  iat: number
  iss: string
  scope: string
  sub: string
}

const header = encode({ alg: 'HS256', typ: 'JWT' })

export function signWorkloadToken(
  claims: Omit<WorkloadTokenClaims, 'exp' | 'iat'>,
  secret: string,
  lifetimeSeconds = 60,
  now = Math.floor(Date.now() / 1000),
): string {
  assertSecret(secret)
  const encodedPayload = encode({ ...claims, exp: now + lifetimeSeconds, iat: now })
  const unsigned = `${header}.${encodedPayload}`
  return `${unsigned}.${signature(unsigned, secret)}`
}

export function verifyWorkloadToken(
  token: string,
  expected: Pick<WorkloadTokenClaims, 'aud' | 'iss' | 'sub'>,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): WorkloadTokenClaims {
  assertSecret(secret)
  const segments = token.split('.')
  if (segments.length !== 3) throw new Error('Malformed workload token')
  const [encodedHeader, encodedPayload, providedSignature] = segments as [string, string, string]
  const parsedHeader = parse(encodedHeader)
  if (parsedHeader.alg !== 'HS256' || parsedHeader.typ !== 'JWT') {
    throw new Error('Unsupported workload token header')
  }
  const unsigned = `${encodedHeader}.${encodedPayload}`
  const expectedSignature = signature(unsigned, secret)
  const provided = Buffer.from(providedSignature, 'base64url')
  const calculated = Buffer.from(expectedSignature, 'base64url')
  if (provided.length !== calculated.length || !timingSafeEqual(provided, calculated)) {
    throw new Error('Invalid workload token signature')
  }

  const claims = parse(encodedPayload)
  if (
    claims.aud !== expected.aud ||
    claims.iss !== expected.iss ||
    claims.sub !== expected.sub ||
    typeof claims.scope !== 'string' ||
    typeof claims.exp !== 'number' ||
    typeof claims.iat !== 'number' ||
    !Number.isInteger(claims.exp) ||
    !Number.isInteger(claims.iat) ||
    claims.exp <= now ||
    claims.exp <= claims.iat ||
    claims.exp - claims.iat > 120 ||
    claims.iat > now + 30
  ) {
    throw new Error('Invalid workload token claims')
  }
  return claims as WorkloadTokenClaims
}

function assertSecret(secret: string): void {
  if (Buffer.byteLength(secret) < 32) throw new Error('Workload token secret must contain 32 bytes')
}

function encode(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function parse(segment: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid workload token JSON')
  }
  return parsed as Record<string, unknown>
}

function signature(unsigned: string, secret: string): string {
  return createHmac('sha256', secret).update(unsigned).digest('base64url')
}
