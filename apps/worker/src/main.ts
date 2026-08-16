import './environment.js'

import { createServer } from 'node:http'

import { Queue, Worker } from 'bullmq'
import type { Job } from 'bullmq'
import pino from 'pino'

import { JOB_NAMES, QUEUE_NAMES } from '@blog/constants'
import { createInternalApiClient } from '@blog/internal-api-client'

import { loadWorkerConfiguration } from './config.js'
import { createWorkloadTokenProvider } from './internal-api/workload-token.js'
import { validateHeartbeatJob, type HeartbeatJobV1 } from './jobs/heartbeat.job.js'
import { processScheduledArticlePublication } from './jobs/scheduled-article-publication.job.js'
import { createScheduledPublicationDispatcher } from './jobs/scheduled-publication-dispatcher.js'
import { createRedisConnectionOptions } from './redis-connection.js'

const configuration = loadWorkerConfiguration()
const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })
const readyWorkers = new Set<string>()
let shuttingDown = false
const internalApiClient = createInternalApiClient({
  baseUrl: configuration.internalApiBaseUrl,
  getAccessToken: createWorkloadTokenProvider({
    audience: configuration.internalApiAudience,
    issuer: configuration.internalApiIssuer,
    secret: configuration.internalApiSecret,
    subject: configuration.internalApiSubject,
  }),
})
const articleCommandQueue = new Queue(QUEUE_NAMES.articleCommands, {
  connection: createRedisConnectionOptions(configuration.redisUrl),
  prefix: configuration.bullmqPrefix,
})
const scheduledPublicationDispatcher = createScheduledPublicationDispatcher(
  configuration.databaseUrl,
  articleCommandQueue,
  {
    batchSize: configuration.outboxBatchSize,
    leaseDurationMs: configuration.outboxLeaseDurationMs,
    retryDelayMs: configuration.outboxRetryDelayMs,
  },
)
let dispatchingOutbox = false

async function dispatchScheduledPublications(): Promise<void> {
  if (dispatchingOutbox || shuttingDown) return
  dispatchingOutbox = true
  try {
    const count = await scheduledPublicationDispatcher.dispatchDue()
    if (count > 0) {
      logger.info({ count }, 'Scheduled publication jobs enqueued')
    }
  } catch (error) {
    logger.error({ error }, 'Scheduled publication outbox dispatch failed')
  } finally {
    dispatchingOutbox = false
  }
}

const outboxDispatchTimer = setInterval(
  () => void dispatchScheduledPublications(),
  configuration.outboxDispatchIntervalMs,
)
outboxDispatchTimer.unref()
void dispatchScheduledPublications()

const maintenanceWorker = new Worker<HeartbeatJobV1, void>(
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
    prefix: configuration.bullmqPrefix,
  },
)

const articleCommandWorker = new Worker(
  QUEUE_NAMES.articleCommands,
  async (job, token) => {
    if (job.name !== JOB_NAMES.publishScheduledArticle) {
      throw new Error(`Unsupported article command job: ${job.name}`)
    }
    return processScheduledArticlePublication(job, token, internalApiClient)
  },
  {
    concurrency: configuration.concurrency,
    connection: createRedisConnectionOptions(configuration.redisUrl),
    prefix: configuration.bullmqPrefix,
  },
)

const workers = [maintenanceWorker, articleCommandWorker]
for (const worker of workers) {
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
    readyWorkers.delete(worker.name)
    logger.error({ error }, 'Worker connection error')
  })
  worker.on('ready', () => {
    readyWorkers.add(worker.name)
    logger.info({ queue: worker.name }, 'Worker is ready')
  })
}

const healthServer = createServer((request, response) => {
  if (request.url === '/live') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end('{"status":"ok"}')
    return
  }
  if (request.url === '/ready') {
    const redisReady = readyWorkers.size === workers.length
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
  readyWorkers.clear()
  logger.info({ signal }, 'Worker shutdown started')
  clearInterval(outboxDispatchTimer)
  await Promise.all(workers.map((worker) => worker.close()))
  await articleCommandQueue.close()
  await scheduledPublicationDispatcher.close()
  await new Promise<void>((resolve, reject) => {
    healthServer.close((error) => (error ? reject(error) : resolve()))
  })
  logger.info({ signal }, 'Worker shutdown completed')
}

process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))
