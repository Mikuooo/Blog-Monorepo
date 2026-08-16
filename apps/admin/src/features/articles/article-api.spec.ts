import type { BlogApiClient } from '@blog/api-client'
import { describe, expect, it, vi } from 'vitest'

import { createArticleApi } from './article-api'

describe('administration article API client', () => {
  it('creates a draft through the generated client with cookie credentials', async () => {
    const client = createClientStub()
    client.POST.mockResolvedValue({ data: commandResponse, response: jsonResponse(201) })
    const body = {
      allowComment: true,
      content: '# Content',
      isFeatured: false,
      isPinned: false,
      slug: 'new-article',
      title: 'New article',
      visibility: 'PUBLIC' as const,
    }

    await expect(
      createArticleApi(() => client as unknown as BlogApiClient).create(body),
    ).resolves.toEqual(commandResponse)
    expect(client.POST).toHaveBeenCalledWith('/api/v1/admin/articles', {
      body,
      credentials: 'include',
    })
  })

  it('lists articles with typed query parameters and supports cancellation', async () => {
    const client = createClientStub()
    const controller = new AbortController()
    const response = { items: [], page: 2, pageSize: 20, total: 0, totalPages: 0 }
    client.GET.mockResolvedValue({ data: response, response: jsonResponse(200) })

    await expect(
      createArticleApi(() => client as unknown as BlogApiClient).list(
        { page: 2, pageSize: 20, status: 'DRAFT' },
        controller.signal,
      ),
    ).resolves.toEqual(response)
    expect(client.GET).toHaveBeenCalledWith('/api/v1/admin/articles', {
      credentials: 'include',
      params: { query: { page: 2, pageSize: 20, status: 'DRAFT' } },
      signal: controller.signal,
    })
  })

  it('preserves API error codes and normalizes network failures', async () => {
    const conflictClient = createClientStub()
    conflictClient.POST.mockResolvedValue({
      error: { code: 'ARTICLE_SLUG_EXISTS', message: 'Conflict', statusCode: 409 },
      response: jsonResponse(409),
    })
    const networkClient = createClientStub()
    networkClient.GET.mockRejectedValue(new TypeError('fetch failed'))

    await expect(
      createArticleApi(() => conflictClient as unknown as BlogApiClient).create({
        allowComment: true,
        content: 'content',
        isFeatured: false,
        isPinned: false,
        slug: 'existing',
        title: 'Existing',
        visibility: 'PUBLIC',
      }),
    ).rejects.toMatchObject({ code: 'ARTICLE_SLUG_EXISTS', status: 409 })
    await expect(
      createArticleApi(() => networkClient as unknown as BlogApiClient).list({
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 })
  })
})

const commandResponse = {
  articleId: '123e4567-e89b-42d3-a456-426614174000',
  passwordProtected: false,
  publishedAt: null,
  revisionId: '123e4567-e89b-42d3-a456-426614174001',
  scheduledAt: null,
  scheduleVersion: 0,
  status: 'DRAFT' as const,
  version: 1,
}

function createClientStub() {
  return { GET: vi.fn(), POST: vi.fn() }
}

function jsonResponse(status: number): Response {
  return new Response('{}', { headers: { 'content-type': 'application/json' }, status })
}
