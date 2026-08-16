import type { BlogApiClient } from '@blog/api-client'
import { describe, expect, it, vi } from 'vitest'

import { createAccessControlApi } from './access-control-api'

describe('access control API adapter', () => {
  it('lists users with typed filters and cancellation', async () => {
    const client = createClientStub()
    const controller = new AbortController()
    const data = { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 }
    client.GET.mockResolvedValue({ data, response: response(200) })

    await expect(
      createAccessControlApi(() => client as unknown as BlogApiClient).listUsers(
        { page: 1, pageSize: 20, status: 'ACTIVE' },
        controller.signal,
      ),
    ).resolves.toEqual(data)
    expect(client.GET).toHaveBeenCalledWith('/api/v1/admin/users', {
      credentials: 'include',
      params: { query: { page: 1, pageSize: 20, status: 'ACTIVE' } },
      signal: controller.signal,
    })
  })

  it('updates user roles and status through generated paths', async () => {
    const client = createClientStub()
    client.PATCH.mockResolvedValue({ data: user, response: response(200) })
    const api = createAccessControlApi(() => client as unknown as BlogApiClient)

    await api.updateUserRoles(user.id, [role.id])
    expect(client.PATCH).toHaveBeenCalledWith('/api/v1/admin/users/{userId}/roles', {
      body: { roleIds: [role.id] },
      credentials: 'include',
      params: { path: { userId: user.id } },
    })
    await api.updateUserStatus(user.id, 'DISABLED')
    expect(client.PATCH).toHaveBeenLastCalledWith('/api/v1/admin/users/{userId}/status', {
      body: { status: 'DISABLED' },
      credentials: 'include',
      params: { path: { userId: user.id } },
    })
  })

  it('preserves role conflict error codes', async () => {
    const client = createClientStub()
    client.POST.mockResolvedValue({
      error: { code: 'ROLE_CODE_EXISTS', message: 'Conflict', statusCode: 409 },
      response: response(409),
    })
    await expect(
      createAccessControlApi(() => client as unknown as BlogApiClient).createRole({
        code: 'EDITOR',
        name: 'Editor',
        permissionIds: [],
      }),
    ).rejects.toMatchObject({ code: 'ROLE_CODE_EXISTS', status: 409 })
  })
})

const role = {
  code: 'EDITOR',
  createdAt: '2026-08-16T00:00:00.000Z',
  description: null,
  id: '123e4567-e89b-42d3-a456-426614174001',
  isSystem: false,
  name: 'Editor',
  permissions: [],
  updatedAt: '2026-08-16T00:00:00.000Z',
  userCount: 1,
}

const user = {
  createdAt: '2026-08-16T00:00:00.000Z',
  displayName: 'Editor',
  email: 'editor@blog.local',
  id: '123e4567-e89b-42d3-a456-426614174000',
  lastLoginAt: null,
  roles: [role],
  status: 'ACTIVE' as const,
  updatedAt: '2026-08-16T00:00:00.000Z',
  username: 'editor',
}

function createClientStub() {
  return { DELETE: vi.fn(), GET: vi.fn(), PATCH: vi.fn(), POST: vi.fn() }
}

function response(status: number): Response {
  return new Response('{}', { headers: { 'content-type': 'application/json' }, status })
}
