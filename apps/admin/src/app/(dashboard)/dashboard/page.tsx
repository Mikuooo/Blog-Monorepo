import { Card, CardContent } from '@blog/ui/components/card'
import type { Metadata } from 'next'

import {
  DashboardOverviewChart,
  type DashboardTrendPoint,
} from '@/features/dashboard/components/dashboard-overview-chart'
import { DashboardTaskSwitcher } from '@/features/dashboard/components/dashboard-task-switcher'

export const metadata: Metadata = { title: '工作台' }

const dashboardTrendHistoryDates = [
  '7 月 14 日',
  '7 月 15 日',
  '7 月 16 日',
  '7 月 17 日',
  '7 月 18 日',
  '7 月 19 日',
  '7 月 20 日',
  '7 月 21 日',
  '7 月 22 日',
  '7 月 23 日',
  '7 月 24 日',
  '7 月 25 日',
  '7 月 26 日',
  '7 月 27 日',
  '7 月 28 日',
  '7 月 29 日',
  '7 月 30 日',
  '7 月 31 日',
  '8 月 1 日',
  '8 月 2 日',
  '8 月 3 日',
  '8 月 4 日',
  '8 月 5 日',
]

const dashboardTrend: ReadonlyArray<DashboardTrendPoint> = [
  ...dashboardTrendHistoryDates.map((date, index) => ({
    date,
    drafts: 15 + ((index * 3) % 10),
    pendingComments: 18 + ((index * 5) % 19),
    published: 8 + ((index * 4) % 12),
    views: 8200 + index * 180 + ((index * 7) % 6) * 260,
  })),
  { date: '8 月 6 日', drafts: 18, pendingComments: 21, published: 9, views: 9600 },
  { date: '8 月 7 日', drafts: 20, pendingComments: 25, published: 12, views: 10800 },
  { date: '8 月 8 日', drafts: 19, pendingComments: 28, published: 15, views: 11600 },
  { date: '8 月 9 日', drafts: 23, pendingComments: 24, published: 11, views: 10500 },
  { date: '8 月 10 日', drafts: 21, pendingComments: 31, published: 17, views: 12900 },
  { date: '8 月 11 日', drafts: 22, pendingComments: 33, published: 14, views: 13200 },
  { date: '8 月 12 日', drafts: 24, pendingComments: 36, published: 19, views: 13800 },
]

export default function DashboardPage() {
  return (
    <div className="grid min-w-0 gap-4 lg:h-[calc(100dvh-7rem)] lg:grid-rows-[18rem_minmax(0,1fr)]">
      <section
        aria-label="工作台摘要"
        className="grid min-h-0 auto-rows-[18rem] grid-cols-1 gap-4 md:grid-cols-2 lg:auto-rows-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)]"
      >
        <Card className="h-full min-h-0 min-w-0 gap-0 py-0">
          <CardContent className="flex h-full flex-col justify-center px-5 py-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-hover">
              Welcome back
            </p>
            <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
              上午好，内容管理员
            </h1>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              掌握内容生产、互动和站点运营的最新状态。
            </p>
          </CardContent>
        </Card>
        <DashboardTaskSwitcher />
        <Card
          className="hidden h-full min-h-0 min-w-0 py-0 lg:block"
          aria-label="预留区域"
        />
      </section>
      <section
        className="h-[26rem] min-h-0 min-w-0 sm:h-[30rem] lg:h-auto"
        aria-label="数据总览"
      >
        <DashboardOverviewChart data={dashboardTrend} />
      </section>
    </div>
  )
}
