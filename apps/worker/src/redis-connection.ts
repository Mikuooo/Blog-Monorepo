import type { ConnectionOptions } from 'bullmq'

export function createRedisConnectionOptions(redisUrl: string): ConnectionOptions {
  const parsed = new URL(redisUrl)
  return {
    host: parsed.hostname,
    maxRetriesPerRequest: null,
    port: Number.parseInt(parsed.port || '6379', 10),
    ...(parsed.username ? { username: decodeURIComponent(parsed.username) } : {}),
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
  }
}
