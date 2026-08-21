export type AdminMedia = {
  bucket: string
  createdAt: string
  filename: string
  id: string
  mediaType: 'AUDIO' | 'DOCUMENT' | 'IMAGE' | 'OTHER' | 'VIDEO'
  mimeType: string
  objectKey: string
  originalName: string
  size: string
  url: string
}

type MediaListResponse = {
  items: AdminMedia[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type ErrorPayload = { code?: string; message?: string }

export class MediaApiError extends Error {
  constructor(readonly code: string, readonly status: number, options?: ErrorOptions) {
    super(code, options)
    this.name = 'MediaApiError'
  }
}

export async function listAdminMedia(signal?: AbortSignal): Promise<MediaListResponse> {
  const response = await request(
    '/api/v1/admin/media?page=1&pageSize=50',
    signal ? { signal } : undefined,
  )
  return response.json() as Promise<MediaListResponse>
}

export async function getAdminMediaDownloadUrl(mediaId: string): Promise<string> {
  const response = await request(`/api/v1/admin/media/${encodeURIComponent(mediaId)}/download-url`)
  const payload = (await response.json()) as { url?: string }
  if (!payload.url) throw new MediaApiError('MEDIA_DOWNLOAD_URL_INVALID', response.status)
  return payload.url
}

export async function deleteAdminMedia(mediaId: string): Promise<void> {
  await request(`/api/v1/admin/media/${encodeURIComponent(mediaId)}`, { method: 'DELETE' })
}

async function request(input: string, init?: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(input, { ...init, credentials: 'include' })
  } catch (error) {
    throw new MediaApiError('NETWORK_ERROR', 0, error instanceof Error ? { cause: error } : undefined)
  }
  if (response.ok) return response
  let payload: ErrorPayload = {}
  try {
    payload = (await response.json()) as ErrorPayload
  } catch {
    // Keep the HTTP status when the server does not return JSON.
  }
  throw new MediaApiError(payload.code || payload.message || 'MEDIA_REQUEST_FAILED', response.status)
}
