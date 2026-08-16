import type { BlogApiClient } from '@blog/api-client'
import { describe, expect, it, vi } from 'vitest'

import { createSettingsApi } from './settings-api'

describe('settings API adapter', () => {
  it('loads settings with credentials and cancellation', async () => {
    const client = createClientStub()
    const controller = new AbortController()
    client.GET.mockResolvedValue({ data: settings, response: response(200) })

    await expect(
      createSettingsApi(() => client as unknown as BlogApiClient).getSettings(controller.signal),
    ).resolves.toEqual(settings)
    expect(client.GET).toHaveBeenCalledWith('/api/v1/admin/settings', {
      credentials: 'include',
      signal: controller.signal,
    })
  })

  it('updates settings through the generated PUT path', async () => {
    const client = createClientStub()
    client.PUT.mockResolvedValue({ data: settings, response: response(200) })
    const body = { basic: settings.basic, content: settings.content, seo: settings.seo }

    await expect(
      createSettingsApi(() => client as unknown as BlogApiClient).updateSettings(body),
    ).resolves.toEqual(settings)
    expect(client.PUT).toHaveBeenCalledWith('/api/v1/admin/settings', {
      body,
      credentials: 'include',
    })
  })

  it('preserves backend permission errors', async () => {
    const client = createClientStub()
    client.GET.mockResolvedValue({
      error: { code: 'PERMISSION_DENIED', message: 'Forbidden', statusCode: 403 },
      response: response(403),
    })

    await expect(
      createSettingsApi(() => client as unknown as BlogApiClient).getSettings(),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED', status: 403 })
  })
})

const settings = {
  basic: {
    faviconUrl: '',
    logoUrl: '',
    siteDescription: '',
    siteName: 'Blog Platform',
    siteUrl: '',
  },
  content: {
    articlesPerPage: 10,
    commentsEnabled: true,
    defaultArticleStatus: 'DRAFT' as const,
  },
  seo: { defaultDescription: '', defaultTitle: '', keywords: [] },
  updatedAt: null,
}

function createClientStub() {
  return { GET: vi.fn(), PUT: vi.fn() }
}

function response(status: number): Response {
  return new Response('{}', { headers: { 'content-type': 'application/json' }, status })
}
