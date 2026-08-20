export type MediaErrorCode = 'MEDIA_NOT_FOUND' | 'MEDIA_KEY_INVALID' | 'MEDIA_SIZE_INVALID' | 'MEDIA_TYPE_INVALID' | 'MEDIA_UPLOAD_TOO_LARGE'
export class MediaError extends Error { constructor(readonly code: MediaErrorCode) { super(code); this.name = 'MediaError' } }
