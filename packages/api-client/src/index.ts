import createClient from 'openapi-fetch'

import type { paths } from '@blog/api-types'

export type BlogApiClient = ReturnType<typeof createClient<paths>>

export function createBlogApiClient(baseUrl: string): BlogApiClient {
  return createClient<paths>({ baseUrl })
}
