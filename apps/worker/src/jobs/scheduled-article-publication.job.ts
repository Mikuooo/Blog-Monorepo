import { createHash } from 'node:crypto'

import { DelayedError, UnrecoverableError } from 'bullmq'
import type { Job } from 'bullmq'

import { scheduledArticlePublicationJobV1Schema } from '@blog/event-contracts'
import type { InternalApiClient } from '@blog/internal-api-client'

export type ScheduledPublicationResult = {
  articleId: string
  outcome: 'PUBLISHED' | 'ALREADY_APPLIED' | 'STALE' | 'NOT_DUE'
  retryAt?: string
}

export async function processScheduledArticlePublication(
  job: Job<unknown>,
  token: string | undefined,
  client: InternalApiClient,
): Promise<ScheduledPublicationResult | void> {
  const parsed = scheduledArticlePublicationJobV1Schema.safeParse(job.data)
  if (!parsed.success) throw new UnrecoverableError('Unsupported article publication job payload')
  const payload = parsed.data
  const idempotencyKey = `article-publish-scheduled-${payload.articleId}-${payload.scheduleVersion}`
  const { data, error, response } = await client.POST(
    '/api/v1/internal/articles/{articleId}/publish-scheduled',
    {
      body: { contractVersion: 1, scheduleVersion: payload.scheduleVersion },
      params: {
        header: {
          'Idempotency-Key': idempotencyKey,
          ...(payload.correlationId ? { 'X-Correlation-ID': payload.correlationId } : {}),
        },
        path: { articleId: payload.articleId },
      },
    },
  )

  if (!response.ok || !data) {
    const status = response.status
    const errorCode = commandErrorCode(error)
    if (
      status === 401 ||
      status === 403 ||
      status === 400 ||
      status === 404 ||
      (status === 409 && errorCode !== 'PUBLICATION_CONFLICT')
    ) {
      throw new UnrecoverableError(`Internal publication command rejected with status ${status}`)
    }
    throw new Error(`Internal publication command failed with status ${status}`)
  }

  if (data.outcome === 'NOT_DUE') {
    if (!data.retryAt || !token)
      throw new Error('NOT_DUE response requires retryAt and a job token')
    await job.moveToDelayed(Date.parse(data.retryAt), token)
    throw new DelayedError()
  }
  return data
}

function commandErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined
  return typeof error.code === 'string' ? error.code : undefined
}

export function scheduledPublicationJobId(articleId: string, scheduleVersion: number): string {
  return createHash('sha256')
    .update(`article.publish-scheduled:${articleId}:${scheduleVersion}`)
    .digest('hex')
}
