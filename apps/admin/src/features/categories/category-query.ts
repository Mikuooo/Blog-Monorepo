'use client'

import { useQuery } from '@tanstack/react-query'

import { listCategories } from './category-api'
import type { CategoryApiError, CategoryListQuery, CategoryListResponse } from './category-api'

export const categoryKeys = {
  all: ['categories'] as const,
  list: (query: CategoryListQuery) => [...categoryKeys.all, 'list', query] as const,
}

export function useCategoryList(query: CategoryListQuery) {
  return useQuery<CategoryListResponse, CategoryApiError>({
    placeholderData: (previous) => previous,
    queryFn: ({ signal }) => listCategories(query, signal),
    queryKey: categoryKeys.list(query),
  })
}
