'use client'

import { useQuery } from '@tanstack/react-query'

import { listArticles, type ArticleListQuery } from './article-api'

export const articleKeys = {
  all: ['articles'] as const,
  list: (query: ArticleListQuery) => [...articleKeys.all, 'list', query] as const,
}

export function useArticleList(query: ArticleListQuery) {
  return useQuery({
    queryFn: ({ signal }) => listArticles(query, signal),
    queryKey: articleKeys.list(query),
    placeholderData: (previous) => previous,
  })
}
