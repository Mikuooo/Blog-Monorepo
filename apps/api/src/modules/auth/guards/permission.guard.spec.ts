import { HttpException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { describe, expect, it, vi } from 'vitest'

import type { AuthenticatedRequest } from '../auth-request.js'
import { PermissionGuard } from './permission.guard.js'

describe('PermissionGuard', () => {
  it('allows an identity with every required permission', () => {
    const reflector = new Reflector()
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['article.read', 'article.update'])
    const guard = new PermissionGuard(reflector)

    expect(guard.canActivate(contextWith(['article.read', 'article.update']))).toBe(true)
  })

  it('returns a stable denial when a permission is missing', () => {
    const reflector = new Reflector()
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['article.publish'])
    const guard = new PermissionGuard(reflector)

    try {
      guard.canActivate(contextWith(['article.read']))
      throw new Error('Expected permission denial')
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException)
      expect((error as HttpException).getResponse()).toMatchObject({
        code: 'PERMISSION_DENIED',
        statusCode: 403,
      })
    }
  })
})

function contextWith(permissions: string[]): ExecutionContext {
  const request: AuthenticatedRequest = {
    auth: {
      id: 'session-id',
      user: {
        displayName: 'Admin',
        email: 'admin@blog.local',
        id: 'user-id',
        permissions,
        roles: ['ADMIN'],
        username: 'admin',
      },
    },
    headers: {},
    method: 'GET',
  }
  return {
    getClass: () => class TestController {},
    getHandler: () => () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext
}
