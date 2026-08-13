import { createHash, randomUUID } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'

import { articlePublishedEventV1Schema, type ArticlePublishedEventV1 } from '@blog/event-contracts'

import {
  ARTICLE_PUBLICATION_UNIT_OF_WORK,
  type ArticlePublicationUnitOfWork,
  type CommandReceiptWriter,
  type PublishScheduledArticleCommand,
  type PublishScheduledArticleOutcome,
} from './article-publication.contract.js'
import { ArticlePublicationError } from './article-publication.errors.js'

const COMMAND_TYPE = 'article.publish-scheduled'
const SYSTEM_ACTOR_ID = 'article-scheduler'

@Injectable()
export class ArticlesService {
  constructor(
    @Inject(ARTICLE_PUBLICATION_UNIT_OF_WORK)
    private readonly unitOfWork: ArticlePublicationUnitOfWork,
  ) {}

  async publishScheduled(
    command: PublishScheduledArticleCommand,
  ): Promise<PublishScheduledArticleOutcome> {
    return this.unitOfWork.execute(async (ports) => {
      const receipt = await ports.commandReceipts.claim({
        commandType: COMMAND_TYPE,
        idempotencyKey: command.idempotencyKey,
        requestHash: command.requestHash,
      })
      if (receipt.state === 'COMPLETED') {
        return receipt.result.outcome === 'PUBLISHED'
          ? { ...receipt.result, outcome: 'ALREADY_APPLIED' }
          : receipt.result
      }

      const article = await ports.articles.findForScheduledPublication(command.articleId)
      if (!article) throw new ArticlePublicationError('ARTICLE_NOT_FOUND')

      if (
        article.deletedAt ||
        article.status !== 'SCHEDULED' ||
        article.scheduleVersion !== command.scheduleVersion ||
        !article.scheduledAt
      ) {
        return this.complete(ports.commandReceipts, command, {
          articleId: command.articleId,
          outcome: 'STALE',
        })
      }

      if (article.scheduledAt > article.databaseNow) {
        return this.complete(ports.commandReceipts, command, {
          articleId: command.articleId,
          outcome: 'NOT_DUE',
          retryAt: article.scheduledAt.toISOString(),
        })
      }

      const publication = await ports.articles.markPublished({
        articleId: article.id,
        expectedScheduleVersion: command.scheduleVersion,
        expectedVersion: article.version,
      })
      if (!publication) throw new ArticlePublicationError('PUBLICATION_CONFLICT')

      const revision = await ports.articles.appendRevision({
        article,
        createdById: SYSTEM_ACTOR_ID,
        version: publication.version,
      })
      await ports.audit.appendArticlePublication({
        actorId: SYSTEM_ACTOR_ID,
        articleId: article.id,
        publishedAt: publication.publishedAt,
        ...(command.correlationId ? { correlationId: command.correlationId } : {}),
      })

      const event = this.createArticlePublishedEvent({
        articleId: article.id,
        articleVersion: publication.version,
        publishedAt: publication.publishedAt,
        revisionId: revision.id,
        ...(command.correlationId ? { correlationId: command.correlationId } : {}),
      })
      await ports.outbox.appendArticlePublished({
        event,
        payloadHash: createHash('sha256').update(JSON.stringify(event)).digest('hex'),
      })

      return this.complete(ports.commandReceipts, command, {
        articleId: article.id,
        outcome: 'PUBLISHED',
        publishedAt: publication.publishedAt.toISOString(),
        revisionId: revision.id,
      })
    })
  }

  private async complete(
    receipts: CommandReceiptWriter,
    command: PublishScheduledArticleCommand,
    result: PublishScheduledArticleOutcome,
  ): Promise<PublishScheduledArticleOutcome> {
    await receipts.complete({
      commandType: COMMAND_TYPE,
      idempotencyKey: command.idempotencyKey,
      result,
    })
    return result
  }

  private createArticlePublishedEvent(input: {
    articleId: string
    articleVersion: number
    correlationId?: string
    publishedAt: Date
    revisionId: string
  }): ArticlePublishedEventV1 {
    return articlePublishedEventV1Schema.parse({
      aggregate: { id: input.articleId, sequence: input.articleVersion, type: 'article' },
      data: { articleId: input.articleId, revisionId: input.revisionId },
      envelopeVersion: 1,
      eventId: randomUUID(),
      eventName: 'article.published',
      eventVersion: 1,
      metadata: {
        actorId: SYSTEM_ACTOR_ID,
        ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      },
      occurredAt: input.publishedAt.toISOString(),
    })
  }
}
