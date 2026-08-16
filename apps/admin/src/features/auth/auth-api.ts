import type { BlogApiClient } from '@blog/api-client'
import { createBlogApiClient } from '@blog/api-client'
import type { components } from '@blog/api-types'

import type { LoginValues } from './auth-schema'

export type AuthUser = components['schemas']['AuthUserDto']
export type LoginResponse = components['schemas']['LoginResponseDto']
type AuthErrorResponse = components['schemas']['AuthErrorResponseDto']

export class AuthApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(code, options)
    this.name = 'AuthApiError'
  }
}

export function createAuthApi(getClient: () => BlogApiClient) {
  return {
    async getCurrentUser(signal?: AbortSignal): Promise<AuthUser | null> {
      try {
        const { data, error, response } = await getClient().GET('/api/v1/auth/me', {
          credentials: 'include',
          ...(signal ? { signal } : {}),
        })
        if (response.status === 401) return null
        if (!response.ok || !data) throw toAuthApiError(error, response)
        return data
      } catch (error) {
        throw normalizeRequestError(error)
      }
    },

    async login(values: LoginValues): Promise<LoginResponse> {
      try {
        const { data, error, response } = await getClient().POST('/api/v1/auth/login', {
          body: values,
          credentials: 'include',
        })
        if (!response.ok || !data) throw toAuthApiError(error, response)
        return data
      } catch (error) {
        throw normalizeRequestError(error)
      }
    },

    async logout(): Promise<void> {
      try {
        const { error, response } = await getClient().POST('/api/v1/auth/logout', {
          credentials: 'include',
        })
        if (response.status === 401) return
        if (!response.ok) throw toAuthApiError(error, response)
      } catch (error) {
        throw normalizeRequestError(error)
      }
    },
  }
}

let browserApiClient: BlogApiClient | undefined

function getBrowserApiClient(): BlogApiClient {
  if (typeof window === 'undefined') {
    throw new AuthApiError('BROWSER_API_UNAVAILABLE', 0)
  }
  browserApiClient ??= createBlogApiClient(window.location.origin)
  return browserApiClient
}

const authApi = createAuthApi(getBrowserApiClient)

export const getCurrentUser = authApi.getCurrentUser
export const login = authApi.login
export const logout = authApi.logout

function toAuthApiError(error: AuthErrorResponse | undefined, response: Response): AuthApiError {
  return new AuthApiError(error?.code || 'AUTH_REQUEST_FAILED', response.status)
}

function normalizeRequestError(error: unknown): AuthApiError {
  if (error instanceof AuthApiError) return error
  return new AuthApiError('NETWORK_ERROR', 0, error instanceof Error ? { cause: error } : undefined)
}
