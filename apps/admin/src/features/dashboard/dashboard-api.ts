import type { BlogApiClient } from '@blog/api-client'
import { createBlogApiClient } from '@blog/api-client'
export type DashboardOverview = { publishedArticles: number; draftArticles: number; pendingComments: number; mediaCount: number; views: string; visitors: string }
export function createDashboardApi(getClient: () => BlogApiClient) { return { async overview(): Promise<DashboardOverview> { const { data, error, response } = await getClient().GET('/api/v1/admin/dashboard/overview', { credentials: 'include' }); if (!response.ok || !data) throw new Error(error ? 'DASHBOARD_REQUEST_FAILED' : `DASHBOARD_${response.status}`); return data as DashboardOverview } } }
let client: BlogApiClient | undefined
function getClient() { if (typeof window === 'undefined') throw new Error('BROWSER_API_UNAVAILABLE'); client ??= createBlogApiClient(window.location.origin); return client }
export const getDashboardOverview = createDashboardApi(getClient).overview
