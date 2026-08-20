import { Injectable } from '@nestjs/common'
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { S3ClientConfig } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { loadS3StorageConfig, type S3StorageConfig } from './s3-storage.config.js'
import type {
  StorageProvider,
  StorageObjectMetadata,
  StorageUploadUrl,
} from './storage-provider.js'

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private client: S3Client | undefined
  private config: S3StorageConfig | undefined

  private getClient(): { client: S3Client; config: S3StorageConfig } {
    if (this.client && this.config) return { client: this.client, config: this.config }
    const config = loadS3StorageConfig()
    const clientOptions: S3ClientConfig = {
      region: config.region,
      forcePathStyle: config.forcePathStyle,
    }
    if (config.endpoint) clientOptions.endpoint = config.endpoint
    if (config.accessKeyId && config.secretAccessKey) {
      clientOptions.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      }
    }
    this.config = config
    this.client = new S3Client(clientOptions)
    return { client: this.client, config }
  }

  async createUploadUrl(input: {
    key: string
    contentType: string
    expiresInSeconds?: number
  }): Promise<StorageUploadUrl> {
    const { client, config } = this.getClient()
    const expiresInSeconds = input.expiresInSeconds ?? config.uploadUrlTtlSeconds
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: config.bucket, Key: input.key, ContentType: input.contentType }),
      { expiresIn: expiresInSeconds },
    )
    return {
      url,
      key: input.key,
      publicUrl: this.publicUrl(input.key, config),
      expiresInSeconds,
    }
  }

  async createDownloadUrl(input: { key: string; expiresInSeconds?: number }): Promise<string> {
    const { client, config } = this.getClient()
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: config.bucket, Key: input.key }),
      { expiresIn: input.expiresInSeconds ?? config.downloadUrlTtlSeconds },
    )
  }

  async deleteObject(key: string): Promise<void> {
    const { client, config } = this.getClient()
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
  }

  async getObjectMetadata(key: string): Promise<StorageObjectMetadata> {
    const { client, config } = this.getClient()
    const object = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }))
    const size = object.ContentLength
    if (size === undefined || !Number.isSafeInteger(size) || size < 0) {
      throw new Error('Storage returned an invalid object size')
    }
    return {
      bucket: config.bucket,
      contentType: object.ContentType ?? null,
      key,
      size,
      stableUrl: this.publicUrl(key, config) ?? `s3://${config.bucket}/${key}`,
    }
  }

  private publicUrl(key: string, config: S3StorageConfig): string | null {
    if (!config.publicBaseUrl) return null
    return `${config.publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`
  }
}
