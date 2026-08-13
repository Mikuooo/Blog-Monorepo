import { z } from 'zod'

const eventMetadataSchema = z
  .object({
    actorId: z.string().min(1).optional(),
    causationId: z.string().min(1).optional(),
    correlationId: z.string().min(1).optional(),
    traceparent: z.string().min(1).optional(),
  })
  .strict()

export const integrationEventEnvelopeV1Schema = z
  .object({
    aggregate: z
      .object({
        id: z.string().min(1),
        sequence: z.number().int().nonnegative(),
        type: z.string().min(1),
      })
      .strict(),
    data: z.record(z.string(), z.unknown()),
    envelopeVersion: z.literal(1),
    eventId: z.uuid(),
    eventName: z.string().min(1),
    eventVersion: z.number().int().positive(),
    metadata: eventMetadataSchema,
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict()

export type IntegrationEventEnvelopeV1 = z.infer<typeof integrationEventEnvelopeV1Schema>

export const articlePublishedEventV1Schema = integrationEventEnvelopeV1Schema.extend({
  aggregate: z
    .object({
      id: z.uuid(),
      sequence: z.number().int().positive(),
      type: z.literal('article'),
    })
    .strict(),
  data: z
    .object({
      articleId: z.uuid(),
      revisionId: z.uuid(),
    })
    .strict(),
  eventName: z.literal('article.published'),
  eventVersion: z.literal(1),
})

export type ArticlePublishedEventV1 = z.infer<typeof articlePublishedEventV1Schema>

export const outboxDeliveryJobV1Schema = z
  .object({
    correlationId: z.string().min(1).optional(),
    deliveryId: z.uuid(),
    eventId: z.uuid(),
    version: z.literal(1),
  })
  .strict()

export type OutboxDeliveryJobV1 = z.infer<typeof outboxDeliveryJobV1Schema>

export const scheduledArticlePublicationJobV1Schema = z
  .object({
    articleId: z.uuid(),
    correlationId: z.string().min(1).max(128).optional(),
    scheduleVersion: z.number().int().positive(),
    version: z.literal(1),
  })
  .strict()

export type ScheduledArticlePublicationJobV1 = z.infer<
  typeof scheduledArticlePublicationJobV1Schema
>
