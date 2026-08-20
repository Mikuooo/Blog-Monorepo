import { describe, expect, it } from 'vitest'

import { loadS3StorageConfig } from './s3-storage.config.js'

describe('loadS3StorageConfig', () => {
  const environment = {
    S3_BUCKET: 'media',
    S3_ENDPOINT: 'https://s3.example.test/',
    S3_REGION: 'auto',
    S3_ACCESS_KEY_ID: 'access',
    S3_SECRET_ACCESS_KEY: 'secret',
    S3_PUBLIC_BASE_URL: 'https://cdn.example.test/',
    S3_FORCE_PATH_STYLE: 'true',
  }

  it('loads and normalizes S3-compatible settings', () => {
    expect(loadS3StorageConfig(environment)).toMatchObject({
      endpoint: 'https://s3.example.test',
      region: 'auto',
      bucket: 'media',
      forcePathStyle: true,
      publicBaseUrl: 'https://cdn.example.test',
      uploadUrlTtlSeconds: 900,
      downloadUrlTtlSeconds: 900,
    })
  })

  it('requires a bucket', () => {
    expect(() => loadS3StorageConfig({})).toThrow('S3_BUCKET')
  })

  it('rejects invalid URL and TTL settings', () => {
    expect(() => loadS3StorageConfig({ S3_BUCKET: 'media', S3_ENDPOINT: 'ftp://s3.test' })).toThrow(
      'S3_ENDPOINT',
    )
    expect(() =>
      loadS3StorageConfig({ S3_BUCKET: 'media', S3_UPLOAD_URL_TTL_SECONDS: '0' }),
    ).toThrow('S3_UPLOAD_URL_TTL_SECONDS')
  })
})
