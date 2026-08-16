import type { BlogApiClient } from '@blog/api-client'
import { createBlogApiClient } from '@blog/api-client'
import type { components } from '@blog/api-types'

import type { CreateArticleRequest } from './article-schema'

export type ArticleCommandResponse = components['schemas']['AdminArticleCommandResponseDto']
export type ArticleListResponse = components['schemas']['AdminArticleListResponseDto']
export type ArticleListQuery = components['schemas']['AdminArticleListQueryDto']

type ArticleErrorResponse = components['schemas']['AdminArticleErrorResponseDto']

export class ArticleApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(code, options)
    this.name = 'ArticleApiError'
  }
}

export function createArticleApi(getClient: () => BlogApiClient) {
  return {
    async create(values: CreateArticleRequest): Promise<ArticleCommandResponse> {
      try {
        const { data, error, response } = await getClient().POST('/api/v1/admin/articles', {
          body: values,
          credentials: 'include',
        })
        if (!response.ok || !data) throw toArticleApiError(error, response)
        return data
      } catch (error) {
        throw normalizeRequestError(error)
      }
    },

    async list(query: ArticleListQuery, signal?: AbortSignal): Promise<ArticleListResponse> {
      try {
        const { data, error, response } = await getClient().GET('/api/v1/admin/articles', {
          credentials: 'include',
          params: { query },
          ...(signal ? { signal } : {}),
        })
        if (!response.ok || !data) throw toArticleApiError(error, response)
        return data
      } catch (error) {
        throw normalizeRequestError(error)
      }
    },
  }
}

let browserApiClient: BlogApiClient | undefined

function getBrowserApiClient(): BlogApiClient {
  if (typeof window === 'undefined') throw new ArticleApiError('BROWSER_API_UNAVAILABLE', 0)
  browserApiClient ??= createBlogApiClient(window.location.origin)
  return browserApiClient
}

const articleApi = createArticleApi(getBrowserApiClient)

export const createArticle = articleApi.create
export const listArticles = articleApi.list

function toArticleApiError(
  error: ArticleErrorResponse | undefined,
  response: Response,
): ArticleApiError {
  return new ArticleApiError(error?.code || 'ARTICLE_REQUEST_FAILED', response.status)
}

function normalizeRequestError(error: unknown): ArticleApiError {
  if (error instanceof ArticleApiError) return error
  return new ArticleApiError(
    'NETWORK_ERROR',
    0,
    error instanceof Error ? { cause: error } : undefined,
  )
}
