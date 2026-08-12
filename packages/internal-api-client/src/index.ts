import createClient from 'openapi-fetch'

import type { paths } from './generated/schema.js'

export type InternalApiClient = ReturnType<typeof createClient<paths>>

export type InternalApiClientOptions = {
  baseUrl: string
  getAccessToken: () => Promise<string>
}

export function createInternalApiClient({
  baseUrl,
  getAccessToken,
}: InternalApiClientOptions): InternalApiClient {
  const client = createClient<paths>({ baseUrl })
  client.use({
    async onRequest({ request }) {
      request.headers.set('Authorization', `Bearer ${await getAccessToken()}`)
      return request
    },
  })
  return client
}
