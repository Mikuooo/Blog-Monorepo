import type { BlogApiClient } from '@blog/api-client'
import { createBlogApiClient } from '@blog/api-client'
import type { components, operations } from '@blog/api-types'

export type Category = components['schemas']['CategoryListItemDto']
export type CategoryListResponse = components['schemas']['CategoryListResponseDto']
export type CategoryListQuery = NonNullable<
  operations['listAdminCategories']['parameters']['query']
>
export type CreateCategoryRequest = components['schemas']['CreateCategoryDto']
export type UpdateCategoryRequest = components['schemas']['UpdateCategoryDto']
export type TaxonomyDeleteResponse = components['schemas']['TaxonomyDeleteResponseDto']
type TaxonomyErrorResponse = components['schemas']['TaxonomyErrorResponseDto']

export class CategoryApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(code, options)
    this.name = 'CategoryApiError'
  }
}

export function createCategoryApi(getClient: () => BlogApiClient) {
  return {
    async create(body: CreateCategoryRequest): Promise<Category> {
      return request<Category>(() =>
        getClient().POST('/api/v1/admin/categories', { body, credentials: 'include' }),
      )
    },
    async delete(categoryId: string): Promise<TaxonomyDeleteResponse> {
      return request<TaxonomyDeleteResponse>(() =>
        getClient().DELETE('/api/v1/admin/categories/{categoryId}', {
          credentials: 'include',
          params: { path: { categoryId } },
        }),
      )
    },
    async list(query: CategoryListQuery, signal?: AbortSignal): Promise<CategoryListResponse> {
      return request<CategoryListResponse>(() =>
        getClient().GET('/api/v1/admin/categories', {
          credentials: 'include',
          params: { query },
          ...(signal ? { signal } : {}),
        }),
      )
    },
    async update(categoryId: string, body: UpdateCategoryRequest): Promise<Category> {
      return request<Category>(() =>
        getClient().PATCH('/api/v1/admin/categories/{categoryId}', {
          body,
          credentials: 'include',
          params: { path: { categoryId } },
        }),
      )
    },
  }
}

let browserClient: BlogApiClient | undefined

function getBrowserClient(): BlogApiClient {
  if (typeof window === 'undefined') throw new CategoryApiError('BROWSER_API_UNAVAILABLE', 0)
  browserClient ??= createBlogApiClient(window.location.origin)
  return browserClient
}

const api = createCategoryApi(getBrowserClient)

export const createCategory = api.create
export const deleteCategory = api.delete
export const listCategories = api.list
export const updateCategory = api.update

async function request<T>(
  work: () => Promise<{ data?: T; error?: TaxonomyErrorResponse; response: Response }>,
): Promise<T> {
  try {
    const { data, error, response } = await work()
    if (!response.ok || !data) {
      throw new CategoryApiError(error?.code || 'CATEGORY_REQUEST_FAILED', response.status)
    }
    return data
  } catch (error) {
    if (error instanceof CategoryApiError) throw error
    throw new CategoryApiError(
      'NETWORK_ERROR',
      0,
      error instanceof Error ? { cause: error } : undefined,
    )
  }
}
