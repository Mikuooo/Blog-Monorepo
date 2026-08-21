type Fetcher = typeof fetch

type UploadUrlResponse = {
  contentType: string
  expiresInSeconds: number
  key: string
  uploadUrl: string
}

type MediaResponse = {
  url: string
}

type ErrorResponse = {
  code?: string
  message?: string
}

export class MediaUploadError extends Error {
  constructor(readonly code: string, options?: ErrorOptions) {
    super(code, options)
    this.name = 'MediaUploadError'
  }
}

export async function uploadMediaImage(
  file: Blob,
  originalName: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  return uploadMediaImageWith(fetch, file, originalName, onProgress)
}

export async function uploadMediaImageWith(
  fetcher: Fetcher,
  file: Blob,
  originalName: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (!file.type.startsWith('image/')) throw new MediaUploadError('MEDIA_IMAGE_TYPE_INVALID')
  if (file.size <= 0) throw new MediaUploadError('MEDIA_IMAGE_EMPTY')

  onProgress?.(0)
  const upload = await requestJson<UploadUrlResponse>(
    fetcher,
    '/api/v1/admin/media/upload-url',
    {
      body: JSON.stringify({ contentType: file.type, originalName, size: file.size }),
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    },
    'MEDIA_UPLOAD_URL_FAILED',
  )

  onProgress?.(15)
  const uploadResponse = await fetcher(upload.uploadUrl, {
    body: file,
    credentials: 'omit',
    headers: { 'content-type': upload.contentType },
    method: 'PUT',
  })
  if (!uploadResponse.ok) throw new MediaUploadError('MEDIA_STORAGE_UPLOAD_FAILED')

  onProgress?.(85)
  const media = await requestJson<MediaResponse>(
    fetcher,
    '/api/v1/admin/media/complete',
    {
      body: JSON.stringify({ key: upload.key, originalName }),
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    },
    'MEDIA_UPLOAD_COMPLETE_FAILED',
  )

  if (!isWebUrl(media.url)) throw new MediaUploadError('MEDIA_PUBLIC_URL_UNAVAILABLE')
  onProgress?.(100)
  return media.url
}

async function requestJson<T>(
  fetcher: Fetcher,
  input: string,
  init: RequestInit,
  fallbackCode: string,
): Promise<T> {
  let response: Response
  try {
    response = await fetcher(input, init)
  } catch (error) {
    throw new MediaUploadError('NETWORK_ERROR', error instanceof Error ? { cause: error } : undefined)
  }

  if (!response.ok) {
    const payload = await readError(response)
    throw new MediaUploadError(payload.code || payload.message || fallbackCode)
  }
  return response.json() as Promise<T>
}

async function readError(response: Response): Promise<ErrorResponse> {
  try {
    return (await response.json()) as ErrorResponse
  } catch {
    return {}
  }
}

function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
