import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  articlePublicationScheduledEventV1Schema,
  articlePublishedEventV1Schema,
  integrationEventEnvelopeV1Schema,
  scheduledArticlePublicationJobV1Schema,
} from './index.js'

describe('integrationEventEnvelopeV1Schema', () => {
  it('accepts the minimal versioned envelope', () => {
    const eventId = randomUUID()
    expect(
      integrationEventEnvelopeV1Schema.parse({
        aggregate: { id: 'article-1', sequence: 1, type: 'article' },
        data: { articleId: 'article-1' },
        envelopeVersion: 1,
        eventId,
        eventName: 'article.published',
        eventVersion: 1,
        metadata: {},
        occurredAt: '2026-08-12T00:00:00.000Z',
      }).eventId,
    ).toBe(eventId)
  })
})

describe('scheduledArticlePublicationJobV1Schema', () => {
  it('rejects mutable state and unsupported versions', () => {
    expect(() =>
      scheduledArticlePublicationJobV1Schema.parse({
        articleId: randomUUID(),
        status: 'PUBLISHED',
        scheduleVersion: 1,
        version: 2,
      }),
    ).toThrow()
  })
})

describe('articlePublishedEventV1Schema', () => {
  it('rejects mutable article content in the minimal event payload', () => {
    expect(() =>
      articlePublishedEventV1Schema.parse({
        aggregate: { id: randomUUID(), sequence: 2, type: 'article' },
        data: { articleId: randomUUID(), content: 'must be reloaded', revisionId: randomUUID() },
        envelopeVersion: 1,
        eventId: randomUUID(),
        eventName: 'article.published',
        eventVersion: 1,
        metadata: {},
        occurredAt: '2026-08-12T00:00:00.000Z',
      }),
    ).toThrow()
  })
})

describe('articlePublicationScheduledEventV1Schema', () => {
  it('accepts only the canonical versioned scheduling payload', () => {
    const articleId = randomUUID()
    const parsed = articlePublicationScheduledEventV1Schema.parse({
      aggregate: { id: articleId, sequence: 4, type: 'article' },
      data: {
        articleId,
        scheduleVersion: 3,
        scheduledAt: '2026-08-13T12:00:00.000Z',
      },
      envelopeVersion: 1,
      eventId: randomUUID(),
      eventName: 'article.publication-scheduled',
      eventVersion: 1,
      metadata: { actorId: randomUUID() },
      occurredAt: '2026-08-13T11:00:00.000Z',
    })
    expect(parsed.data).toEqual({
      articleId,
      scheduleVersion: 3,
      scheduledAt: '2026-08-13T12:00:00.000Z',
    })
  })

  it('rejects mutable article content', () => {
    const articleId = randomUUID()
    expect(() =>
      articlePublicationScheduledEventV1Schema.parse({
        aggregate: { id: articleId, sequence: 2, type: 'article' },
        data: {
          articleId,
          content: 'must be reloaded',
          scheduleVersion: 2,
          scheduledAt: '2026-08-13T12:00:00.000Z',
        },
        envelopeVersion: 1,
        eventId: randomUUID(),
        eventName: 'article.publication-scheduled',
        eventVersion: 1,
        metadata: {},
        occurredAt: '2026-08-13T11:00:00.000Z',
      }),
    ).toThrow()
  })
})
