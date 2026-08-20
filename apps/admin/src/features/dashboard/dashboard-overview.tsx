'use client'
import { Card, CardContent } from '@blog/ui/components/card'
import { useDashboardOverview } from './dashboard-query'
export function DashboardOverview() { const query = useDashboardOverview(); const data = query.data as { publishedArticles?: number; draftArticles?: number; pendingComments?: number; views?: string } | undefined; return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[['已发布', data?.publishedArticles ?? 0], ['草稿', data?.draftArticles ?? 0], ['待审核评论', data?.pendingComments ?? 0], ['阅读量', data?.views ?? '0']].map(([label, value]) => <Card key={String(label)}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{query.isPending ? '...' : value}</p></CardContent></Card>)}</div> }
