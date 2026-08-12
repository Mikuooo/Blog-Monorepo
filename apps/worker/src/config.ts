import { getRequiredEnvironmentVariable } from '@blog/config'

export type WorkerConfiguration = {
  concurrency: number
  healthPort: number
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

  return {
    concurrency: positiveInteger(environment.WORKER_CONCURRENCY, 4, 'WORKER_CONCURRENCY'),
    healthPort: positiveInteger(environment.WORKER_HEALTH_PORT, 3003, 'WORKER_HEALTH_PORT'),
    redisUrl,
  }
}
