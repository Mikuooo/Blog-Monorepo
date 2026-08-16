'use client'

import { useQuery } from '@tanstack/react-query'

import { listTags } from './tag-api'
import type { TagApiError, TagListQuery, TagListResponse } from './tag-api'

export const tagKeys = {
  all: ['tags'] as const,
  list: (query: TagListQuery) => [...tagKeys.all, 'list', query] as const,
}

export function useTagList(query: TagListQuery) {
  return useQuery<TagListResponse, TagApiError>({
    placeholderData: (previous) => previous,
    queryFn: ({ signal }) => listTags(query, signal),
    queryKey: tagKeys.list(query),
  })
}
