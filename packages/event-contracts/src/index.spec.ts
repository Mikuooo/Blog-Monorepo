import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { integrationEventEnvelopeV1Schema } from './index.js'

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
