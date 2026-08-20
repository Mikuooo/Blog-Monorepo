import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { STORAGE_PROVIDER, type StorageProvider } from '../../../infrastructure/storage/storage-provider.js'
import { MediaError } from './media.errors.js'
import { MEDIA_REPOSITORY, type MediaCompleteInput, type MediaListQuery, type MediaRepository, type MediaType, type MediaUploadInput, type MediaUploadResult } from './media.contract.js'

const MIME_TYPES = new Set(['audio/', 'application/', 'image/', 'text/', 'video/'])
const maxUploadBytes = () => Number.parseInt(process.env.MEDIA_MAX_UPLOAD_BYTES ?? '26214400', 10)
const validContentType = (contentType: string) => MIME_TYPES.has(contentType.split('/')[0] + '/')
const mediaType = (mimeType: string): MediaType => {
  if (mimeType.startsWith('image/')) return 'IMAGE'
  if (mimeType.startsWith('video/')) return 'VIDEO'
  if (mimeType.startsWith('audio/')) return 'AUDIO'
  if (mimeType.startsWith('application/') || mimeType.startsWith('text/')) return 'DOCUMENT'
  return 'OTHER'
}

@Injectable()
export class MediaService {
  constructor(@Inject(MEDIA_REPOSITORY) private readonly repository: MediaRepository, @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}
  async createUploadUrl(input: MediaUploadInput): Promise<MediaUploadResult> {
    const contentType = input.contentType.trim().toLowerCase()
    if (!contentType || !validContentType(contentType)) throw new MediaError('MEDIA_TYPE_INVALID')
    if (!Number.isSafeInteger(input.size) || input.size <= 0 || input.size > maxUploadBytes()) throw new MediaError('MEDIA_UPLOAD_TOO_LARGE')
    const key = `media/${input.actorId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}`
    const signed = await this.storage.createUploadUrl({ contentType, key })
    return { contentType, expiresInSeconds: signed.expiresInSeconds, key, uploadUrl: signed.url }
  }
  async complete(input: MediaCompleteInput) {
    const keyPattern = new RegExp(`^media/${input.actorId}/\\d{4}-\\d{2}-\\d{2}/[0-9a-f-]{36}$`)
    if (!keyPattern.test(input.key)) throw new MediaError('MEDIA_KEY_INVALID')
    const metadata = await this.storage.getObjectMetadata(input.key)
    if (!metadata.contentType || !validContentType(metadata.contentType)) throw new MediaError('MEDIA_TYPE_INVALID')
    if (metadata.size <= 0) throw new MediaError('MEDIA_SIZE_INVALID')
    if (metadata.size > maxUploadBytes()) throw new MediaError('MEDIA_UPLOAD_TOO_LARGE')
    const filename = input.key.split('/').pop() ?? input.key
    return this.repository.complete({ ...input, bucket: metadata.bucket, filename, mediaType: mediaType(metadata.contentType), mimeType: metadata.contentType, size: metadata.size, stableUrl: metadata.stableUrl })
  }
  list(query: MediaListQuery) { return this.repository.list(query) }
  async getById(id: string) { const media = await this.repository.findById(id); if (!media) throw new MediaError('MEDIA_NOT_FOUND'); return media }
  async downloadUrl(id: string) { const media = await this.getById(id); return { url: await this.storage.createDownloadUrl({ key: media.objectKey }) } }
  async delete(id: string) { const media = await this.repository.softDelete(id); if (!media) throw new MediaError('MEDIA_NOT_FOUND'); await this.storage.deleteObject(media.objectKey); return { id } }
}
