import { describe, expect, it, vi } from 'vitest'

import type { BlogApiClient } from '@blog/api-client'

import { createAuthApi } from './auth-api'

describe('administration auth API client', () => {
  it('logs in through the generated client with cookie credentials', async () => {
    const client = createClientStub()
    client.POST.mockResolvedValue({
      data: {
        expiresAt: '2026-08-15T12:00:00.000Z',
        user: adminUser,
      },
      response: jsonResponse(200),
    })

    const result = await createAuthApi(() => client as unknown as BlogApiClient).login({
      identifier: 'admin@blog.local',
      password: 'correct-password',
    })

    expect(result.user).toEqual(adminUser)
    expect(client.POST).toHaveBeenCalledWith('/api/v1/auth/login', {
      body: { identifier: 'admin@blog.local', password: 'correct-password' },
      credentials: 'include',
    })
  })

  it('returns null for an unauthenticated current-user request', async () => {
    const client = createClientStub()
    client.GET.mockResolvedValue({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required.',
        statusCode: 401,
      },
      response: jsonResponse(401),
    })

    await expect(
      createAuthApi(() => client as unknown as BlogApiClient).getCurrentUser(),
    ).resolves.toBeNull()
  })

  it('preserves stable API error codes and normalizes network failures', async () => {
    const rejectedClient = createClientStub()
    rejectedClient.POST.mockResolvedValue({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'The supplied credentials are invalid.',
        statusCode: 401,
      },
      response: jsonResponse(401),
    })
    const networkClient = createClientStub()
    networkClient.GET.mockRejectedValue(new TypeError('fetch failed'))

    await expect(
      createAuthApi(() => rejectedClient as unknown as BlogApiClient).login({
        identifier: 'admin',
        password: 'wrong',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 })
    await expect(
      createAuthApi(() => networkClient as unknown as BlogApiClient).getCurrentUser(),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 })
  })

  it('treats an already-expired session as successfully logged out', async () => {
    const client = createClientStub()
    client.POST.mockResolvedValue({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required.',
        statusCode: 401,
      },
      response: jsonResponse(401),
    })

    await expect(
      createAuthApi(() => client as unknown as BlogApiClient).logout(),
    ).resolves.toBeUndefined()
  })
})

const adminUser = {
  displayName: 'Local Administrator',
  email: 'admin@blog.local',
  id: '2f512afe-1b79-4a6c-8f8e-30ce3de74ed2',
  permissions: ['dashboard.read'],
  roles: ['SUPER_ADMIN'],
  username: 'admin',
}

function createClientStub() {
  return {
    GET: vi.fn(),
    POST: vi.fn(),
  }
}

function jsonResponse(status: number): Response {
  return new Response('{}', { headers: { 'content-type': 'application/json' }, status })
}
