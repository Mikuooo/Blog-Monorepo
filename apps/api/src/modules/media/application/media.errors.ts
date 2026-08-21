export type MediaErrorCode = 'MEDIA_NOT_FOUND' | 'MEDIA_KEY_INVALID' | 'MEDIA_OBJECT_UNAVAILABLE' | 'MEDIA_SIZE_INVALID' | 'MEDIA_TYPE_INVALID' | 'MEDIA_UPLOAD_TOO_LARGE'
export class MediaError extends Error {
  constructor(readonly code: MediaErrorCode, options?: ErrorOptions) {
    super(code, options)
    this.name = 'MediaError'
  }
}
