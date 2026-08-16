import type { BlogApiClient } from '@blog/api-client'
import { createBlogApiClient } from '@blog/api-client'
import type { components, operations } from '@blog/api-types'

export type AdminUser = components['schemas']['AdminUserListItemDto']
export type AdminUserListResponse = components['schemas']['AdminUserListResponseDto']
export type UserListQuery = NonNullable<operations['listAdminUsers']['parameters']['query']>
export type AdminRole = components['schemas']['AdminRoleListItemDto']
export type AdminRoleListResponse = components['schemas']['AdminRoleListResponseDto']
export type RoleListQuery = NonNullable<operations['listAdminRoles']['parameters']['query']>
export type Permission = components['schemas']['PermissionSummaryDto']
export type CreateRoleRequest = components['schemas']['CreateRoleDto']
export type UpdateRoleRequest = components['schemas']['UpdateRoleDto']
export type UserStatus = components['schemas']['UpdateUserStatusDto']['status']
type AccessControlErrorResponse = components['schemas']['AccessControlErrorResponseDto']

export class AccessControlApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(code, options)
    this.name = 'AccessControlApiError'
  }
}

export function createAccessControlApi(getClient: () => BlogApiClient) {
  return {
    async createRole(body: CreateRoleRequest): Promise<AdminRole> {
      return request<AdminRole>(() =>
        getClient().POST('/api/v1/admin/roles', { body, credentials: 'include' }),
      )
    },
    async deleteRole(roleId: string): Promise<{ id: string }> {
      return request<{ id: string }>(() =>
        getClient().DELETE('/api/v1/admin/roles/{roleId}', {
          credentials: 'include',
          params: { path: { roleId } },
        }),
      )
    },
    async listPermissions(signal?: AbortSignal): Promise<Permission[]> {
      return request<Permission[]>(() =>
        getClient().GET('/api/v1/admin/roles/permissions', {
          credentials: 'include',
          ...(signal ? { signal } : {}),
        }),
      )
    },
    async listRoles(query: RoleListQuery, signal?: AbortSignal): Promise<AdminRoleListResponse> {
      return request<AdminRoleListResponse>(() =>
        getClient().GET('/api/v1/admin/roles', {
          credentials: 'include',
          params: { query },
          ...(signal ? { signal } : {}),
        }),
      )
    },
    async listUsers(query: UserListQuery, signal?: AbortSignal): Promise<AdminUserListResponse> {
      return request<AdminUserListResponse>(() =>
        getClient().GET('/api/v1/admin/users', {
          credentials: 'include',
          params: { query },
          ...(signal ? { signal } : {}),
        }),
      )
    },
    async updateRole(roleId: string, body: UpdateRoleRequest): Promise<AdminRole> {
      return request<AdminRole>(() =>
        getClient().PATCH('/api/v1/admin/roles/{roleId}', {
          body,
          credentials: 'include',
          params: { path: { roleId } },
        }),
      )
    },
    async updateUserRoles(userId: string, roleIds: string[]): Promise<AdminUser> {
      return request<AdminUser>(() =>
        getClient().PATCH('/api/v1/admin/users/{userId}/roles', {
          body: { roleIds },
          credentials: 'include',
          params: { path: { userId } },
        }),
      )
    },
    async updateUserStatus(userId: string, status: UserStatus): Promise<AdminUser> {
      return request<AdminUser>(() =>
        getClient().PATCH('/api/v1/admin/users/{userId}/status', {
          body: { status },
          credentials: 'include',
          params: { path: { userId } },
        }),
      )
    },
  }
}

let browserClient: BlogApiClient | undefined

function getBrowserClient(): BlogApiClient {
  if (typeof window === 'undefined') throw new AccessControlApiError('BROWSER_API_UNAVAILABLE', 0)
  browserClient ??= createBlogApiClient(window.location.origin)
  return browserClient
}

const api = createAccessControlApi(getBrowserClient)

export const createRole = api.createRole
export const deleteRole = api.deleteRole
export const listPermissions = api.listPermissions
export const listRoles = api.listRoles
export const listUsers = api.listUsers
export const updateRole = api.updateRole
export const updateUserRoles = api.updateUserRoles
export const updateUserStatus = api.updateUserStatus

async function request<T>(
  work: () => Promise<{ data?: T; error?: AccessControlErrorResponse; response: Response }>,
): Promise<T> {
  try {
    const { data, error, response } = await work()
    if (!response.ok || !data) {
      throw new AccessControlApiError(
        error?.code || 'ACCESS_CONTROL_REQUEST_FAILED',
        response.status,
      )
    }
    return data
  } catch (error) {
    if (error instanceof AccessControlApiError) throw error
    throw new AccessControlApiError(
      'NETWORK_ERROR',
      0,
      error instanceof Error ? { cause: error } : undefined,
    )
  }
}
