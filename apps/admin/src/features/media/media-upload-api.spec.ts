import { describe, expect, it, vi } from 'vitest'

import type { MediaUploadError } from './media-upload-api'
import { uploadMediaImageWith } from './media-upload-api'

describe('uploadMediaImageWith', () => {
  it('uploads an image through the presigned media flow', async () => {
    const progress = vi.fn()
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json(
          {
            contentType: 'image/png',
            expiresInSeconds: 900,
            key: 'media/user/2026-08-21/id',
            uploadUrl: 'https://storage.test/upload',
          },
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        Response.json({ url: 'https://cdn.test/media/image.png' }, { status: 201 }),
      )
    const file = new Blob(['image'], { type: 'image/png' })

    await expect(uploadMediaImageWith(fetcher, file, 'image.png', progress)).resolves.toBe(
      'https://cdn.test/media/image.png',
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      'https://storage.test/upload',
      expect.objectContaining({ body: file, credentials: 'omit', method: 'PUT' }),
    )
    expect(progress.mock.calls.map(([value]) => value)).toEqual([0, 15, 85, 100])
  })

  it('surfaces API error codes and stops before storage upload', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ code: 'MEDIA_UPLOAD_TOO_LARGE' }, { status: 400 }),
      )

    await expect(
      uploadMediaImageWith(fetcher, new Blob(['image'], { type: 'image/png' }), 'image.png'),
    ).rejects.toEqual(expect.objectContaining<Partial<MediaUploadError>>({ code: 'MEDIA_UPLOAD_TOO_LARGE' }))
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('rejects a storage-only URL that browsers cannot render', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json(
          {
            contentType: 'image/png',
            expiresInSeconds: 900,
            key: 'media/user/2026-08-21/id',
            uploadUrl: 'https://storage.test/upload',
          },
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(Response.json({ url: 's3://media/image' }, { status: 201 }))

    await expect(
      uploadMediaImageWith(fetcher, new Blob(['image'], { type: 'image/png' }), 'image.png'),
    ).rejects.toEqual(expect.objectContaining<Partial<MediaUploadError>>({ code: 'MEDIA_PUBLIC_URL_UNAVAILABLE' }))
  })
})
