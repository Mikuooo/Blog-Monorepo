import { describe, expect, it, vi } from 'vitest'

import type { MediaApiError } from './media-api'
import { deleteAdminMedia, getAdminMediaDownloadUrl, listAdminMedia } from './media-api'

describe('media api', () => {
  it('lists registered media with credentials', async () => {
    const originalFetch = globalThis.fetch
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ items: [], page: 1, pageSize: 50, total: 0, totalPages: 0 }),
    )
    globalThis.fetch = fetchMock
    try {
      await expect(listAdminMedia()).resolves.toMatchObject({ items: [], total: 0 })
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/admin/media?page=1&pageSize=50',
        expect.objectContaining({ credentials: 'include' }),
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('gets a signed download URL and deletes media', async () => {
    const originalFetch = globalThis.fetch
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ url: 'https://download.test/image.png' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    globalThis.fetch = fetchMock
    try {
      await expect(getAdminMediaDownloadUrl('media-id')).resolves.toBe('https://download.test/image.png')
      await expect(deleteAdminMedia('media-id')).resolves.toBeUndefined()
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        '/api/v1/admin/media/media-id/download-url',
        expect.objectContaining({ credentials: 'include' }),
      )
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        '/api/v1/admin/media/media-id',
        expect.objectContaining({ credentials: 'include', method: 'DELETE' }),
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('preserves API error codes', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ code: 'MEDIA_NOT_FOUND' }, { status: 404 }),
    )
    try {
      await expect(listAdminMedia()).rejects.toEqual(
        expect.objectContaining<Partial<MediaApiError>>({ code: 'MEDIA_NOT_FOUND', status: 404 }),
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
