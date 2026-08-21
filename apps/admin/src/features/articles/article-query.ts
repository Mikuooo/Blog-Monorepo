'use client'

import { useQuery } from '@tanstack/react-query'

import { getArticle, listArticles, type ArticleListQuery } from './article-api'

export const articleKeys = {
  all: ['articles'] as const,
  list: (query: ArticleListQuery) => [...articleKeys.all, 'list', query] as const,
  detail: (articleId: string) => [...articleKeys.all, 'detail', articleId] as const,
}

export function useArticleDetail(articleId: string) {
  return useQuery({
    queryFn: ({ signal }) => getArticle(articleId, signal),
    queryKey: articleKeys.detail(articleId),
  })
}

export function useArticleList(query: ArticleListQuery) {
  return useQuery({
    queryFn: ({ signal }) => listArticles(query, signal),
    queryKey: articleKeys.list(query),
    placeholderData: (previous) => previous,
  })
}
