'use client'

import { queryOptions, useQuery } from '@tanstack/react-query'

import { getCurrentUser } from './auth-api'

export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const,
}

export const currentUserQueryOptions = queryOptions({
  queryFn: ({ signal }) => getCurrentUser(signal),
  queryKey: authKeys.currentUser(),
  retry: false,
  staleTime: 30_000,
})

export function useCurrentUser() {
  return useQuery(currentUserQueryOptions)
}
