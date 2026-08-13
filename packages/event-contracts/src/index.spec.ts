import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
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
