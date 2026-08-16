import type { BlogApiClient } from '@blog/api-client'
import { describe, expect, it, vi } from 'vitest'

import { createCategoryApi } from './category-api'

describe('category API adapter', () => {
  it('lists categories with typed query parameters and cancellation', async () => {
    const client = createClientStub()
    const controller = new AbortController()
    const data = { items: [], page: 2, pageSize: 20, total: 0, totalPages: 0 }
    client.GET.mockResolvedValue({ data, response: response(200) })

    await expect(
      createCategoryApi(() => client as unknown as BlogApiClient).list(
        { keyword: 'engineering', page: 2, pageSize: 20 },
        controller.signal,
      ),
    ).resolves.toEqual(data)
    expect(client.GET).toHaveBeenCalledWith('/api/v1/admin/categories', {
      credentials: 'include',
      params: { query: { keyword: 'engineering', page: 2, pageSize: 20 } },
      signal: controller.signal,
    })
  })

  it('updates and deletes categories through generated paths', async () => {
    const client = createClientStub()
    client.PATCH.mockResolvedValue({ data: category, response: response(200) })
    client.DELETE.mockResolvedValue({
      data: { articleCount: 2, id: category.id },
      response: response(200),
    })
    const api = createCategoryApi(() => client as unknown as BlogApiClient)

    await expect(api.update(category.id, { name: 'Updated' })).resolves.toEqual(category)
    expect(client.PATCH).toHaveBeenCalledWith('/api/v1/admin/categories/{categoryId}', {
      body: { name: 'Updated' },
      credentials: 'include',
      params: { path: { categoryId: category.id } },
    })
    await expect(api.delete(category.id)).resolves.toEqual({ articleCount: 2, id: category.id })
  })

  it('preserves taxonomy error codes', async () => {
    const client = createClientStub()
    client.POST.mockResolvedValue({
      error: { code: 'CATEGORY_SLUG_EXISTS', message: 'Conflict', statusCode: 409 },
      response: response(409),
    })
    await expect(
      createCategoryApi(() => client as unknown as BlogApiClient).create({
        name: 'Engineering',
        slug: 'engineering',
        sortOrder: 0,
      }),
    ).rejects.toMatchObject({ code: 'CATEGORY_SLUG_EXISTS', status: 409 })
  })
})

const category = {
  articleCount: 2,
  childCount: 0,
  createdAt: '2026-08-16T00:00:00.000Z',
  description: null,
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'Engineering',
  parent: null,
  slug: 'engineering',
  sortOrder: 0,
  updatedAt: '2026-08-16T00:00:00.000Z',
}

function createClientStub() {
  return { DELETE: vi.fn(), GET: vi.fn(), PATCH: vi.fn(), POST: vi.fn() }
}

function response(status: number): Response {
  return new Response('{}', { headers: { 'content-type': 'application/json' }, status })
}
