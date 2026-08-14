import { getRequiredEnvironmentVariable } from '@blog/config'

export type WorkerConfiguration = {
  concurrency: number
  databaseUrl: string
  healthPort: number
  internalApiAudience: string
  internalApiBaseUrl: string
  internalApiIssuer: string
  internalApiSecret: string
  internalApiSubject: string
  outboxBatchSize: number
  outboxDispatchIntervalMs: number
  outboxLeaseDurationMs: number
  outboxRetryDelayMs: number
  redisUrl: string
}

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return parsed
}

export function loadWorkerConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): WorkerConfiguration {
  const redisUrl = getRequiredEnvironmentVariable('REDIS_URL', environment)
  const protocol = new URL(redisUrl).protocol
  if (protocol !== 'redis:' && protocol !== 'rediss:') {
    throw new Error('REDIS_URL must use redis:// or rediss://')
  }

  const internalApiBaseUrl = getRequiredEnvironmentVariable('INTERNAL_API_BASE_URL', environment)
  const internalApiUrl = new URL(internalApiBaseUrl)
  const internalApiProtocol = internalApiUrl.protocol
  if (internalApiProtocol !== 'http:' && internalApiProtocol !== 'https:') {
    throw new Error('INTERNAL_API_BASE_URL must use http:// or https://')
  }
  if (internalApiUrl.pathname !== '/' || internalApiUrl.search || internalApiUrl.hash) {
    throw new Error('INTERNAL_API_BASE_URL must contain only the API origin without a path')
  }
  const internalApiSecret = getRequiredEnvironmentVariable('INTERNAL_WORKLOAD_SECRET', environment)
  if (Buffer.byteLength(internalApiSecret) < 32) {
    throw new Error('INTERNAL_WORKLOAD_SECRET must contain at least 32 bytes')
  }

  return {
    concurrency: positiveInteger(environment.WORKER_CONCURRENCY, 4, 'WORKER_CONCURRENCY'),
    databaseUrl: getRequiredEnvironmentVariable('DATABASE_URL', environment),
    healthPort: positiveInteger(environment.WORKER_HEALTH_PORT, 3003, 'WORKER_HEALTH_PORT'),
    internalApiAudience: getRequiredEnvironmentVariable('INTERNAL_WORKLOAD_AUDIENCE', environment),
    internalApiBaseUrl,
    internalApiIssuer: getRequiredEnvironmentVariable('INTERNAL_WORKLOAD_ISSUER', environment),
    internalApiSecret,
    internalApiSubject: getRequiredEnvironmentVariable('INTERNAL_WORKLOAD_SUBJECT', environment),
    outboxBatchSize: positiveInteger(environment.OUTBOX_BATCH_SIZE, 50, 'OUTBOX_BATCH_SIZE'),
    outboxDispatchIntervalMs: positiveInteger(
      environment.OUTBOX_DISPATCH_INTERVAL_MS,
      5_000,
      'OUTBOX_DISPATCH_INTERVAL_MS',
    ),
    outboxLeaseDurationMs: positiveInteger(
      environment.OUTBOX_LEASE_DURATION_MS,
      30_000,
      'OUTBOX_LEASE_DURATION_MS',
    ),
    outboxRetryDelayMs: positiveInteger(
      environment.OUTBOX_RETRY_DELAY_MS,
      5_000,
      'OUTBOX_RETRY_DELAY_MS',
    ),
    redisUrl,
  }
}
