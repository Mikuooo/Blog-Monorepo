export type MediaType = 'AUDIO' | 'DOCUMENT' | 'IMAGE' | 'OTHER' | 'VIDEO'

export type MediaRecord = {
  bucket: string
  createdAt: string
  filename: string
  id: string
  mediaType: MediaType
  mimeType: string
  objectKey: string
  originalName: string
  size: string
  url: string
}

export type MediaListQuery = { keyword?: string; mediaType?: MediaType; page: number; pageSize: number }
export type MediaListResult = { items: MediaRecord[]; page: number; pageSize: number; total: number; totalPages: number }
export type MediaUploadInput = { actorId: string; contentType: string; originalName: string; size: number }
export type MediaUploadResult = { contentType: string; expiresInSeconds: number; key: string; uploadUrl: string }
export type MediaCompleteInput = { actorId: string; key: string; originalName: string }

export const MEDIA_REPOSITORY = Symbol('MEDIA_REPOSITORY')
export interface MediaRepository {
  complete(input: MediaCompleteInput & { bucket: string; filename: string; mediaType: MediaType; mimeType: string; size: number; stableUrl: string }): Promise<MediaRecord>
  findById(id: string, includeDeleted?: boolean): Promise<(MediaRecord & { objectKey: string; deletedAt: string | null }) | null>
  list(query: MediaListQuery): Promise<MediaListResult>
  softDelete(id: string): Promise<(MediaRecord & { objectKey: string; deletedAt: string | null }) | null>
}
