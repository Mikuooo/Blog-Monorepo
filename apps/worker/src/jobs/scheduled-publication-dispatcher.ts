import { randomUUID } from 'node:crypto'

import type { JobsOptions, Queue } from 'bullmq'

import { createDatabaseClient, type DatabaseClient } from '@blog/database'
import { articlePublicationScheduledEventV1Schema } from '@blog/event-contracts'

import { scheduledPublicationJobId } from './scheduled-article-publication.job.js'

type ScheduledPublicationQueue = Pick<Queue, 'add'>

type ClaimedDelivery = {
  delivery_id: string
  payload: unknown
}

export type ScheduledPublicationDispatcherOptions = {
  batchSize: number
  leaseDurationMs: number
  retryDelayMs: number
}

export class ScheduledPublicationDispatcher {
  private readonly leaseOwner = `scheduled-publication-dispatcher:${randomUUID()}`

  constructor(
    private readonly database: DatabaseClient,
    private readonly queue: ScheduledPublicationQueue,
    private readonly options: ScheduledPublicationDispatcherOptions,
  ) {}

  async dispatchDue(): Promise<number> {
    const deliveries = await this.claimDue()
    let dispatched = 0
    for (const delivery of deliveries) {
      const parsed = articlePublicationScheduledEventV1Schema.safeParse(delivery.payload)
      if (!parsed.success) {
        await this.markDead(delivery.delivery_id)
        continue
      }
      try {
        const event = parsed.data
        const jobId = scheduledPublicationJobId(event.data.articleId, event.data.scheduleVersion)
        const jobOptions: JobsOptions = {
          attempts: 5,
          backoff: { delay: 5_000, type: 'exponential' },
          jobId,
          removeOnComplete: 1_000,
          removeOnFail: 5_000,
        }
        await this.queue.add(
          'article.publish-scheduled',
          {
            articleId: event.data.articleId,
            scheduleVersion: event.data.scheduleVersion,
            version: 1,
          },
          jobOptions,
        )
        await this.database.outboxDelivery.update({
          data: {
            bullmqJobId: jobId,
            enqueuedAt: new Date(),
            lastErrorAt: null,
            lastErrorCode: null,
            lastErrorKind: null,
            lastErrorSummary: null,
            leaseExpiresAt: null,
            leaseOwner: null,
            status: 'ENQUEUED',
          },
          where: { id: delivery.delivery_id },
        })
        dispatched += 1
      } catch (error) {
        await this.releaseForRetry(delivery.delivery_id, error)
      }
    }
    return dispatched
  }

  close(): Promise<void> {
    return this.database.$disconnect()
  }

  private claimDue(): Promise<ClaimedDelivery[]> {
    const leaseExpiresAt = new Date(Date.now() + this.options.leaseDurationMs)
    return this.database.$queryRaw<ClaimedDelivery[]>`
      WITH candidates AS (
        SELECT delivery.id
          FROM outbox_deliveries AS delivery
          JOIN outbox_events AS event ON event.id = delivery.event_id
         WHERE delivery.consumer_key = 'article.publish-scheduled.v1'
           AND delivery.next_attempt_at <= CURRENT_TIMESTAMP
           AND (
             delivery.status = 'pending'::outbox_delivery_status
             OR (
               delivery.status = 'leased'::outbox_delivery_status
               AND delivery.lease_expires_at <= CURRENT_TIMESTAMP
             )
           )
         ORDER BY delivery.next_attempt_at, delivery.created_at, delivery.id
         FOR UPDATE OF delivery SKIP LOCKED
         LIMIT ${this.options.batchSize}
      )
      UPDATE outbox_deliveries AS delivery
         SET status = 'leased'::outbox_delivery_status,
             lease_owner = ${this.leaseOwner},
             lease_expires_at = ${leaseExpiresAt},
             dispatch_attempts = delivery.dispatch_attempts + 1,
             updated_at = CURRENT_TIMESTAMP
        FROM candidates, outbox_events AS event
       WHERE delivery.id = candidates.id
         AND event.id = delivery.event_id
      RETURNING delivery.id AS delivery_id, event.payload
    `
  }

  private async releaseForRetry(deliveryId: string, error: unknown): Promise<void> {
    const errorKind = error instanceof Error ? error.name : 'UnknownError'
    await this.database.outboxDelivery.update({
      data: {
        lastErrorAt: new Date(),
        lastErrorCode: 'DISPATCH_FAILED',
        lastErrorKind: 'TRANSIENT',
        lastErrorSummary: `Scheduled publication dispatch failed (${errorKind})`,
        leaseExpiresAt: null,
        leaseOwner: null,
        nextAttemptAt: new Date(Date.now() + this.options.retryDelayMs),
        status: 'PENDING',
      },
      where: { id: deliveryId },
    })
  }

  private async markDead(deliveryId: string): Promise<void> {
    await this.database.outboxDelivery.update({
      data: {
        deadLetteredAt: new Date(),
        lastErrorAt: new Date(),
        lastErrorCode: 'INVALID_EVENT_PAYLOAD',
        lastErrorKind: 'PERMANENT',
        lastErrorSummary: 'Scheduled publication event payload is invalid',
        leaseExpiresAt: null,
        leaseOwner: null,
        status: 'DEAD',
      },
      where: { id: deliveryId },
    })
  }
}

export function createScheduledPublicationDispatcher(
  databaseUrl: string,
  queue: ScheduledPublicationQueue,
  options: ScheduledPublicationDispatcherOptions,
): ScheduledPublicationDispatcher {
  return new ScheduledPublicationDispatcher(createDatabaseClient(databaseUrl), queue, options)
}
