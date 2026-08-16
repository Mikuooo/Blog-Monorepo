import type { BlogApiClient } from '@blog/api-client'
import { createBlogApiClient } from '@blog/api-client'
import type { components, operations } from '@blog/api-types'

export type Tag = components['schemas']['TagListItemDto']
export type TagListResponse = components['schemas']['TagListResponseDto']
export type TagListQuery = NonNullable<operations['listAdminTags']['parameters']['query']>
export type CreateTagRequest = components['schemas']['CreateTagDto']
export type UpdateTagRequest = components['schemas']['UpdateTagDto']
export type TaxonomyDeleteResponse = components['schemas']['TaxonomyDeleteResponseDto']
type TaxonomyErrorResponse = components['schemas']['TaxonomyErrorResponseDto']

export class TagApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(code, options)
    this.name = 'TagApiError'
  }
}

export function createTagApi(getClient: () => BlogApiClient) {
  return {
    async create(body: CreateTagRequest): Promise<Tag> {
      return request<Tag>(() =>
        getClient().POST('/api/v1/admin/tags', { body, credentials: 'include' }),
      )
    },
    async delete(tagId: string): Promise<TaxonomyDeleteResponse> {
      return request<TaxonomyDeleteResponse>(() =>
        getClient().DELETE('/api/v1/admin/tags/{tagId}', {
          credentials: 'include',
          params: { path: { tagId } },
        }),
      )
    },
    async list(query: TagListQuery, signal?: AbortSignal): Promise<TagListResponse> {
      return request<TagListResponse>(() =>
        getClient().GET('/api/v1/admin/tags', {
          credentials: 'include',
          params: { query },
          ...(signal ? { signal } : {}),
        }),
      )
    },
    async update(tagId: string, body: UpdateTagRequest): Promise<Tag> {
      return request<Tag>(() =>
        getClient().PATCH('/api/v1/admin/tags/{tagId}', {
          body,
          credentials: 'include',
          params: { path: { tagId } },
        }),
      )
    },
  }
}

let browserClient: BlogApiClient | undefined
function getBrowserClient(): BlogApiClient {
  if (typeof window === 'undefined') throw new TagApiError('BROWSER_API_UNAVAILABLE', 0)
  browserClient ??= createBlogApiClient(window.location.origin)
  return browserClient
}

const api = createTagApi(getBrowserClient)
export const createTag = api.create
export const deleteTag = api.delete
export const listTags = api.list
export const updateTag = api.update

async function request<T>(
  work: () => Promise<{ data?: T; error?: TaxonomyErrorResponse; response: Response }>,
): Promise<T> {
  try {
    const { data, error, response } = await work()
    if (!response.ok || !data)
      throw new TagApiError(error?.code || 'TAG_REQUEST_FAILED', response.status)
    return data
  } catch (error) {
    if (error instanceof TagApiError) throw error
    throw new TagApiError('NETWORK_ERROR', 0, error instanceof Error ? { cause: error } : undefined)
  }
}
