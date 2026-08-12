import { createServer } from 'node:http'

import { Worker } from 'bullmq'
import type { Job } from 'bullmq'
import pino from 'pino'

import { JOB_NAMES, QUEUE_NAMES } from '@blog/constants'

import { loadWorkerConfiguration } from './config.js'
import { validateHeartbeatJob, type HeartbeatJobV1 } from './jobs/heartbeat.job.js'
import { createRedisConnectionOptions } from './redis-connection.js'

const configuration = loadWorkerConfiguration()
const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })
let redisReady = false
let shuttingDown = false

const worker = new Worker<HeartbeatJobV1, void>(
  QUEUE_NAMES.maintenance,
  async (job: Job<HeartbeatJobV1>) => {
    if (job.name !== JOB_NAMES.heartbeat) {
      throw new Error(`Unsupported maintenance job: ${job.name}`)
    }
    validateHeartbeatJob(job.data)
    logger.info({ jobId: job.id, queue: job.queueName }, 'Heartbeat job completed')
  },
  {
    concurrency: configuration.concurrency,
    connection: createRedisConnectionOptions(configuration.redisUrl),
  },
)

worker.on('completed', (job) => {
  logger.info({ jobId: job.id, queue: job.queueName }, 'Job completed')
})
worker.on('failed', (job, error) => {
  logger.error(
    { attempt: job?.attemptsMade, error, jobId: job?.id, queue: job?.queueName },
    'Job failed',
  )
})
worker.on('error', (error) => {
  redisReady = false
  logger.error({ error }, 'Worker connection error')
})
worker.on('ready', () => {
  redisReady = true
  logger.info({ queue: QUEUE_NAMES.maintenance }, 'Worker is ready')
})

const healthServer = createServer((request, response) => {
  if (request.url === '/live') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end('{"status":"ok"}')
    return
  }
  if (request.url === '/ready') {
    response.writeHead(redisReady && !shuttingDown ? 200 : 503, {
      'content-type': 'application/json',
    })
    response.end(
      JSON.stringify({ redis: redisReady, status: redisReady ? 'ready' : 'unavailable' }),
    )
    return
  }
  response.writeHead(404).end()
})

healthServer.listen(configuration.healthPort, '0.0.0.0', () => {
  logger.info({ port: configuration.healthPort }, 'Worker health server listening')
})

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  redisReady = false
  logger.info({ signal }, 'Worker shutdown started')
  await worker.close()
  await new Promise<void>((resolve, reject) => {
    healthServer.close((error) => (error ? reject(error) : resolve()))
  })
  logger.info({ signal }, 'Worker shutdown completed')
}

process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))
