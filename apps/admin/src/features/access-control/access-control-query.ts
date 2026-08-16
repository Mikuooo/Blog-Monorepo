'use client'

import { useQuery } from '@tanstack/react-query'

import { listPermissions, listRoles, listUsers } from './access-control-api'
import type {
  AccessControlApiError,
  AdminRoleListResponse,
  AdminUserListResponse,
  Permission,
  RoleListQuery,
  UserListQuery,
} from './access-control-api'

export const accessControlKeys = {
  all: ['access-control'] as const,
  permissions: () => [...accessControlKeys.all, 'permissions'] as const,
  roles: (query: RoleListQuery) => [...accessControlKeys.all, 'roles', query] as const,
  users: (query: UserListQuery) => [...accessControlKeys.all, 'users', query] as const,
}

export function useAdminUsers(query: UserListQuery, enabled: boolean) {
  return useQuery<AdminUserListResponse, AccessControlApiError>({
    enabled,
    placeholderData: (previous) => previous,
    queryFn: ({ signal }) => listUsers(query, signal),
    queryKey: accessControlKeys.users(query),
  })
}

export function useAdminRoles(query: RoleListQuery, enabled: boolean) {
  return useQuery<AdminRoleListResponse, AccessControlApiError>({
    enabled,
    placeholderData: (previous) => previous,
    queryFn: ({ signal }) => listRoles(query, signal),
    queryKey: accessControlKeys.roles(query),
  })
}

export function useAdminPermissions(enabled: boolean) {
  return useQuery<Permission[], AccessControlApiError>({
    enabled,
    queryFn: ({ signal }) => listPermissions(signal),
    queryKey: accessControlKeys.permissions(),
    staleTime: 60_000,
  })
}
