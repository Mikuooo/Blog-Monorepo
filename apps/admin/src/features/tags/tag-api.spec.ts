import type { BlogApiClient } from '@blog/api-client'
import { describe, expect, it, vi } from 'vitest'

import { createTagApi } from './tag-api'

describe('tag API adapter', () => {
  it('creates and lists tags with cookie credentials', async () => {
    const client = createClientStub()
    client.POST.mockResolvedValue({ data: tag, response: response(201) })
    client.GET.mockResolvedValue({
      data: { items: [tag], page: 1, pageSize: 20, total: 1, totalPages: 1 },
      response: response(200),
    })
    const api = createTagApi(() => client as unknown as BlogApiClient)

    await expect(api.create({ name: 'PostgreSQL', slug: 'postgresql' })).resolves.toEqual(tag)
    expect(client.POST).toHaveBeenCalledWith('/api/v1/admin/tags', {
      body: { name: 'PostgreSQL', slug: 'postgresql' },
      credentials: 'include',
    })
    await api.list({ page: 1, pageSize: 20 })
    expect(client.GET).toHaveBeenCalledWith('/api/v1/admin/tags', {
      credentials: 'include',
      params: { query: { page: 1, pageSize: 20 } },
    })
  })

  it('uses typed path parameters for updates and deletes', async () => {
    const client = createClientStub()
    client.PATCH.mockResolvedValue({ data: tag, response: response(200) })
    client.DELETE.mockResolvedValue({
      data: { articleCount: 1, id: tag.id },
      response: response(200),
    })
    const api = createTagApi(() => client as unknown as BlogApiClient)

    await api.update(tag.id, { description: 'Database' })
    expect(client.PATCH).toHaveBeenCalledWith('/api/v1/admin/tags/{tagId}', {
      body: { description: 'Database' },
      credentials: 'include',
      params: { path: { tagId: tag.id } },
    })
    await expect(api.delete(tag.id)).resolves.toEqual({ articleCount: 1, id: tag.id })
  })
})

const tag = {
  articleCount: 1,
  createdAt: '2026-08-16T00:00:00.000Z',
  description: null,
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'PostgreSQL',
  slug: 'postgresql',
  updatedAt: '2026-08-16T00:00:00.000Z',
}

function createClientStub() {
  return { DELETE: vi.fn(), GET: vi.fn(), PATCH: vi.fn(), POST: vi.fn() }
}

function response(status: number): Response {
  return new Response('{}', { headers: { 'content-type': 'application/json' }, status })
}
