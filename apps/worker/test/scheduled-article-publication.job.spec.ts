import { DelayedError, UnrecoverableError } from 'bullmq'
import { describe, expect, it, vi } from 'vitest'

import type { InternalApiClient } from '@blog/internal-api-client'

import { processScheduledArticlePublication } from '../src/jobs/scheduled-article-publication.job.js'

const payload = {
  articleId: '019ff5b6-03e0-7e92-8ad6-b4492b6809f0',
  scheduleVersion: 7,
  version: 1,
} as const

describe('processScheduledArticlePublication', () => {
  it.each(['PUBLISHED', 'ALREADY_APPLIED', 'STALE'] as const)(
    'completes terminal outcome %s',
    async (outcome) => {
      const client = clientReturning(200, { articleId: payload.articleId, outcome })
      await expect(
        processScheduledArticlePublication(job(), 'token', client),
      ).resolves.toMatchObject({
        outcome,
      })
    },
  )

  it('moves NOT_DUE to its exact retry timestamp', async () => {
    const retryAt = '2026-08-12T12:00:00.000Z'
    const moveToDelayed = vi.fn().mockResolvedValue(undefined)
    const client = clientReturning(200, {
      articleId: payload.articleId,
      outcome: 'NOT_DUE',
      retryAt,
    })

    await expect(
      processScheduledArticlePublication(job(moveToDelayed), 'lock-token', client),
    ).rejects.toBeInstanceOf(DelayedError)
    expect(moveToDelayed).toHaveBeenCalledWith(Date.parse(retryAt), 'lock-token')
  })

  it.each([400, 401, 403, 404])('marks status %s as unrecoverable', async (status) => {
    await expect(
      processScheduledArticlePublication(
        job(),
        'token',
        clientReturning(status, { code: 'ERROR' }),
      ),
    ).rejects.toBeInstanceOf(UnrecoverableError)
  })

  it('retries transient responses and publication conflicts', async () => {
    await expect(
      processScheduledArticlePublication(
        job(),
        'token',
        clientReturning(503, { code: 'UPSTREAM' }),
      ),
    ).rejects.toThrow('status 503')
    await expect(
      processScheduledArticlePublication(
        job(),
        'token',
        clientReturning(409, { code: 'PUBLICATION_CONFLICT' }),
      ),
    ).rejects.not.toBeInstanceOf(UnrecoverableError)
  })

  it('rejects unsupported payloads without calling the API', async () => {
    const post = vi.fn()
    await expect(
      processScheduledArticlePublication(job(undefined, { ...payload, version: 2 }), 'token', {
        POST: post,
      } as unknown as InternalApiClient),
    ).rejects.toBeInstanceOf(UnrecoverableError)
    expect(post).not.toHaveBeenCalled()
  })
})

function job(moveToDelayed = vi.fn(), data: unknown = payload) {
  return { data, moveToDelayed } as never
}

function clientReturning(status: number, body: unknown): InternalApiClient {
  const ok = status >= 200 && status < 300
  return {
    POST: vi.fn().mockResolvedValue({
      data: ok ? body : undefined,
      error: ok ? undefined : body,
      response: new Response(JSON.stringify(body), { status }),
    }),
  } as unknown as InternalApiClient
}
