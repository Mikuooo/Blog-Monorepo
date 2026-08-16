import type { BlogApiClient } from '@blog/api-client'
import { createBlogApiClient } from '@blog/api-client'
import type { components } from '@blog/api-types'

export type SystemSettings = components['schemas']['SystemSettingsResponseDto']
export type UpdateSystemSettingsRequest = components['schemas']['UpdateSystemSettingsDto']
type SettingsErrorResponse = components['schemas']['SettingsErrorResponseDto']

export class SettingsApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(code, options)
    this.name = 'SettingsApiError'
  }
}

export function createSettingsApi(getClient: () => BlogApiClient) {
  return {
    async getSettings(signal?: AbortSignal): Promise<SystemSettings> {
      return request<SystemSettings>(() =>
        getClient().GET('/api/v1/admin/settings', {
          credentials: 'include',
          ...(signal ? { signal } : {}),
        }),
      )
    },
    async updateSettings(body: UpdateSystemSettingsRequest): Promise<SystemSettings> {
      return request<SystemSettings>(() =>
        getClient().PUT('/api/v1/admin/settings', { body, credentials: 'include' }),
      )
    },
  }
}

let browserClient: BlogApiClient | undefined

function getBrowserClient(): BlogApiClient {
  if (typeof window === 'undefined') throw new SettingsApiError('BROWSER_API_UNAVAILABLE', 0)
  browserClient ??= createBlogApiClient(window.location.origin)
  return browserClient
}

const api = createSettingsApi(getBrowserClient)

export const getSettings = api.getSettings
export const updateSettings = api.updateSettings

async function request<T>(
  work: () => Promise<{ data?: T; error?: SettingsErrorResponse; response: Response }>,
): Promise<T> {
  try {
    const { data, error, response } = await work()
    if (!response.ok || !data) {
      throw new SettingsApiError(error?.code || 'SETTINGS_REQUEST_FAILED', response.status)
    }
    return data
  } catch (error) {
    if (error instanceof SettingsApiError) throw error
    throw new SettingsApiError(
      'NETWORK_ERROR',
      0,
      error instanceof Error ? { cause: error } : undefined,
    )
  }
}
