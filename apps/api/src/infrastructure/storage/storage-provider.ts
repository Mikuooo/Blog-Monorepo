export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER')

export type StorageUploadUrlInput = {
  key: string
  contentType: string
  expiresInSeconds?: number
}

export type StorageDownloadUrlInput = {
  key: string
  expiresInSeconds?: number
}

export type StorageUploadUrl = {
  url: string
  key: string
  publicUrl: string | null
  expiresInSeconds: number
}

export type StorageObjectMetadata = {
  bucket: string
  contentType: string | null
  key: string
  size: number
  stableUrl: string
}

export interface StorageProvider {
  createUploadUrl(input: StorageUploadUrlInput): Promise<StorageUploadUrl>
  createDownloadUrl(input: StorageDownloadUrlInput): Promise<string>
  deleteObject(key: string): Promise<void>
  getObjectMetadata(key: string): Promise<StorageObjectMetadata>
}
