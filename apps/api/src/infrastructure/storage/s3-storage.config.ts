import { getRequiredEnvironmentVariable } from '@blog/config'

export type S3StorageConfig = {
  endpoint: string | undefined
  region: string
  bucket: string
  accessKeyId: string | undefined
  secretAccessKey: string | undefined
  forcePathStyle: boolean
  publicBaseUrl: string | undefined
  uploadUrlTtlSeconds: number
  downloadUrlTtlSeconds: number
}

function optionalEnvironmentVariable(
  name: string,
  environment: Readonly<Record<string, string | undefined>>,
): string | undefined {
  const value = environment[name]?.trim()
  return value || undefined
}

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === '') return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return parsed
}

function optionalUrl(name: string, value: string | undefined): string | undefined {
  if (!value) return undefined
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${name} must be a valid URL`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${name} must use http or https`)
  }
  return parsed.toString().replace(/\/$/, '')
}

export function loadS3StorageConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): S3StorageConfig {
  const endpoint = optionalUrl('S3_ENDPOINT', optionalEnvironmentVariable('S3_ENDPOINT', environment))
  const publicBaseUrl = optionalUrl(
    'S3_PUBLIC_BASE_URL',
    optionalEnvironmentVariable('S3_PUBLIC_BASE_URL', environment),
  )
  const forcePathStyle = (optionalEnvironmentVariable('S3_FORCE_PATH_STYLE', environment) ?? 'false') === 'true'
  const accessKeyId = optionalEnvironmentVariable('S3_ACCESS_KEY_ID', environment)
  const secretAccessKey = optionalEnvironmentVariable('S3_SECRET_ACCESS_KEY', environment)
  if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
    throw new Error('S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be configured together')
  }

  return {
    endpoint,
    region: optionalEnvironmentVariable('S3_REGION', environment) ?? 'us-east-1',
    bucket: getRequiredEnvironmentVariable('S3_BUCKET', environment),
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
    publicBaseUrl,
    uploadUrlTtlSeconds: positiveInteger(environment.S3_UPLOAD_URL_TTL_SECONDS, 900, 'S3_UPLOAD_URL_TTL_SECONDS'),
    downloadUrlTtlSeconds: positiveInteger(
      environment.S3_DOWNLOAD_URL_TTL_SECONDS,
      900,
      'S3_DOWNLOAD_URL_TTL_SECONDS',
    ),
  }
}
