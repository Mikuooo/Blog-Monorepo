import { sessionTtlSeconds } from './application/auth.service.js'

export function readSessionCookie(cookieHeader: string | undefined): string | undefined {
  const cookieName = sessionCookieName()
  for (const entry of cookieHeader?.split(';') ?? []) {
    const separator = entry.indexOf('=')
    if (separator < 0 || entry.slice(0, separator).trim() !== cookieName) continue
    try {
      return decodeURIComponent(entry.slice(separator + 1).trim()) || undefined
    } catch {
      return undefined
    }
  }
  return undefined
}

export function createSessionCookie(token: string): string {
  return serializeCookie(encodeURIComponent(token), `Max-Age=${sessionTtlSeconds()}`)
}

export function clearSessionCookie(): string {
  return serializeCookie('', 'Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT')
}

export function sessionCookieName(): string {
  return process.env.AUTH_SESSION_COOKIE_NAME?.trim() || 'blog_session'
}

function serializeCookie(value: string, lifetime: string): string {
  const parts = [
    `${sessionCookieName()}=${value}`,
    'Path=/api',
    'HttpOnly',
    'SameSite=Lax',
    lifetime,
  ]
  if (process.env.NODE_ENV === 'production') parts.push('Secure')
  return parts.join('; ')
}
