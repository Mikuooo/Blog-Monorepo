import { Badge } from '@blog/ui/components/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@blog/ui/components/card'
import type { Metadata } from 'next'
import Link from 'next/link'

import { Icon, type IconName } from '@/components/icons'
import { PageHeader } from '@/components/page-header'

export const metadata: Metadata = { title: '工作台' }

const stats: Array<{ change: string; icon: IconName; label: string; tone: string; value: string }> =
  [
    {
      change: '较上周 +12%',
      icon: 'file-text',
      label: '已发布文章',
      tone: 'bg-primary-soft text-primary-hover',
      value: '128',
    },
    {
      change: '7 篇等待完成',
      icon: 'clock',
      label: '草稿与待发布',
      tone: 'bg-amber-50 text-amber-700',
      value: '24',
    },
    {
      change: '今日 +18',
      icon: 'message',
      label: '待审核评论',
      tone: 'bg-violet-50 text-violet-700',
      value: '36',
    },
    {
      change: '近 30 天 +8.4%',
      icon: 'eye',
      label: '文章阅读量',
      tone: 'bg-emerald-50 text-emerald-700',
      value: '82.4k',
    },
  ]

const recentArticles = [
  { date: '8 月 12 日 14:30', status: '已发布', title: '从零构建一个可维护的内容平台' },
  { date: '8 月 12 日 09:12', status: '草稿', title: 'Next.js Server Components 实践笔记' },
  { date: '8 月 11 日 18:46', status: '审核中', title: '写给独立开发者的内容工作流' },
  { date: '8 月 10 日 11:05', status: '已发布', title: '如何设计可靠的后台任务' },
]

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        description="掌握内容生产、互动和站点运营的最新状态。当前展示数据为第一批 UI fixture。"
        eyebrow="Overview"
        title="上午好，内容管理员"
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="关键指标">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5 sm:pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="mt-3 text-3xl font-bold tracking-tight">{stat.value}</p>
                </div>
                <div className={`grid size-10 place-items-center rounded-xl ${stat.tone}`}>
                  <Icon className="size-5" name={stat.icon} />
                </div>
              </div>
              <p className="mt-4 text-xs font-medium text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>最近文章</CardTitle>
              <CardDescription className="mt-1">最近更新的内容及发布状态</CardDescription>
            </div>
            <Link
              className="inline-flex items-center gap-1 text-sm font-semibold text-success hover:underline"
              href="/articles"
            >
              查看全部 <Icon className="size-4" name="arrow-up-right" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentArticles.map((article) => (
              <article
                className="flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-primary-soft/60"
                key={article.title}
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted">
                  <Icon className="size-5 text-muted-foreground" name="file-text" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold">{article.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">最后更新：{article.date}</p>
                </div>
                <Badge
                  variant={
                    article.status === '已发布'
                      ? 'success'
                      : article.status === '草稿'
                        ? 'secondary'
                        : 'warning'
                  }
                >
                  {article.status}
                </Badge>
              </article>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>本周内容进度</CardTitle>
            <CardDescription>从草稿到发布的内容分布</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3" aria-label="本周共处理 31 篇内容">
              <span className="text-4xl font-bold">31</span>
              <span className="pb-1 text-sm text-muted-foreground">篇内容</span>
            </div>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-muted">
              <div className="flex h-full">
                <span className="w-[55%] bg-primary" />
                <span className="w-[26%] bg-amber-400" />
                <span className="w-[19%] bg-slate-300" />
              </div>
            </div>
            <dl className="mt-6 space-y-4">
              {[
                ['已发布', '17', 'bg-primary'],
                ['待审核', '8', 'bg-amber-400'],
                ['草稿', '6', 'bg-slate-300'],
              ].map(([label, value, color]) => (
                <div className="flex items-center" key={label}>
                  <span className={`mr-3 size-2.5 rounded-full ${color}`} />
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="ml-auto text-sm font-bold">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </section>
    </>
  )
}
