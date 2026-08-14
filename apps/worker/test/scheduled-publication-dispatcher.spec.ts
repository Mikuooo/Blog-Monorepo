import { describe, expect, it, vi } from 'vitest'

import type { DatabaseClient } from '@blog/database'

import { ScheduledPublicationDispatcher } from '../src/jobs/scheduled-publication-dispatcher.js'

const articleId = '019ff5b6-03e0-7e92-8ad6-b4492b6809f0'

describe('ScheduledPublicationDispatcher', () => {
  it('enqueues a minimal versioned command and marks the delivery enqueued', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    const database = databaseReturning([delivery()], update)
    const add = vi.fn().mockResolvedValue({ id: 'job' })
    const dispatcher = new ScheduledPublicationDispatcher(database, { add } as never, options())

    await expect(dispatcher.dispatchDue()).resolves.toBe(1)
    expect(add).toHaveBeenCalledWith(
      'article.publish-scheduled',
      { articleId, scheduleVersion: 7, version: 1 },
      expect.objectContaining({ attempts: 5, jobId: expect.stringMatching(/^[a-f0-9]{64}$/u) }),
    )
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ENQUEUED' }),
        where: { id: 'delivery-1' },
      }),
    )
    expect(JSON.stringify(add.mock.calls)).not.toContain('article body')
  })

  it('releases failed enqueue attempts for a bounded retry', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    const database = databaseReturning([delivery()], update)
    const add = vi.fn().mockRejectedValue(new Error('redis unavailable with no credentials'))
    const dispatcher = new ScheduledPublicationDispatcher(database, { add } as never, options())

    await expect(dispatcher.dispatchDue()).resolves.toBe(0)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lastErrorCode: 'DISPATCH_FAILED',
          lastErrorKind: 'TRANSIENT',
          status: 'PENDING',
        }),
        where: { id: 'delivery-1' },
      }),
    )
  })

  it('dead-letters noncanonical payloads before enqueueing', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    const database = databaseReturning(
      [{ delivery_id: 'delivery-1', payload: { content: 'bad' } }],
      update,
    )
    const add = vi.fn()
    const dispatcher = new ScheduledPublicationDispatcher(database, { add } as never, options())

    await expect(dispatcher.dispatchDue()).resolves.toBe(0)
    expect(add).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lastErrorCode: 'INVALID_EVENT_PAYLOAD',
          lastErrorKind: 'PERMANENT',
          status: 'DEAD',
        }),
      }),
    )
  })
})

function delivery() {
  return {
    delivery_id: 'delivery-1',
    payload: {
      aggregate: { id: articleId, sequence: 4, type: 'article' },
      data: {
        articleId,
        scheduleVersion: 7,
        scheduledAt: '2026-08-13T12:00:00.000Z',
      },
      envelopeVersion: 1,
      eventId: '019ff5b6-03e0-7e92-8ad6-b4492b6809f1',
      eventName: 'article.publication-scheduled',
      eventVersion: 1,
      metadata: {},
      occurredAt: '2026-08-13T11:00:00.000Z',
    },
  }
}

function databaseReturning(rows: unknown[], update: ReturnType<typeof vi.fn>): DatabaseClient {
  return {
    $queryRaw: vi.fn().mockResolvedValue(rows),
    outboxDelivery: { update },
  } as unknown as DatabaseClient
}

function options() {
  return { batchSize: 50, leaseDurationMs: 30_000, retryDelayMs: 5_000 }
}
