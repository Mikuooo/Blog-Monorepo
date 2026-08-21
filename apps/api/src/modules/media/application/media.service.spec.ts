import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StorageProvider } from '../../../infrastructure/storage/storage-provider.js'
import type { MediaRepository } from './media.contract.js'
import type { MediaError } from './media.errors.js'
import { MediaService } from './media.service.js'

const repository: MediaRepository = {
  complete: vi.fn(), findById: vi.fn(), list: vi.fn(), softDelete: vi.fn(),
}
const storage: StorageProvider = {
  createDownloadUrl: vi.fn(), createUploadUrl: vi.fn(), deleteObject: vi.fn(), getObjectMetadata: vi.fn(),
}

describe('MediaService', () => {
  afterEach(() => { vi.restoreAllMocks(); delete process.env.MEDIA_MAX_UPLOAD_BYTES })
  it('creates an actor-scoped upload key', async () => {
    vi.mocked(storage.createUploadUrl).mockImplementation(async ({ key }) => ({ expiresInSeconds: 900, key, publicUrl: null, url: 'https://upload.test' }))
    const result = await new MediaService(repository, storage).createUploadUrl({ actorId: 'actor', contentType: 'image/png', originalName: 'cover.png', size: 10 })
    expect(result.key).toMatch(/^media\/actor\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]+$/)
  })
  it('rejects objects that exceed the limit after upload', async () => {
    process.env.MEDIA_MAX_UPLOAD_BYTES = '10'
    const key = 'media/actor/2026-08-19/00000000-0000-0000-0000-000000000000'
    vi.mocked(storage.getObjectMetadata).mockResolvedValue({ bucket: 'media', contentType: 'image/png', key, size: 11, stableUrl: 's3://media/key' })
    await expect(new MediaService(repository, storage).complete({ actorId: 'actor', key, originalName: 'cover.png' })).rejects.toEqual(expect.objectContaining<Partial<MediaError>>({ code: 'MEDIA_UPLOAD_TOO_LARGE' }))
  })
  it('rejects keys outside the authenticated actor prefix', async () => {
    await expect(new MediaService(repository, storage).complete({ actorId: 'actor', key: 'media/other/key', originalName: 'cover.png' })).rejects.toEqual(expect.objectContaining<Partial<MediaError>>({ code: 'MEDIA_KEY_INVALID' }))
  })
  it('maps storage metadata failures to a media error instead of leaking a 500', async () => {
    const key = 'media/actor/2026-08-19/00000000-0000-0000-0000-000000000000'
    vi.mocked(storage.getObjectMetadata).mockRejectedValue(new Error('HeadObject failed'))
    await expect(new MediaService(repository, storage).complete({ actorId: 'actor', key, originalName: 'cover.png' })).rejects.toEqual(expect.objectContaining<Partial<MediaError>>({ code: 'MEDIA_OBJECT_UNAVAILABLE' }))
  })
})
