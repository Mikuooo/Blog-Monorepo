'use client'

import { Card, CardContent, CardHeader } from '@blog/ui/components/card'
import { useState } from 'react'

const taskGroups = {
  schedules: [
    { meta: '2 分钟后', title: '扫描并发布到期文章' },
    { meta: '10 分钟后', title: '同步文章搜索索引' },
    { meta: '今天 23:30', title: '聚合站点访问数据' },
  ],
  todos: [
    { meta: '评论审核', title: '处理 36 条待审核评论' },
    { meta: '内容发布', title: '完成 7 篇待提交文章' },
    { meta: '站点运营', title: '检查首页推荐内容' },
  ],
} as const

const taskTabs = [
  { label: '待办', value: 'todos' },
  { label: '定时任务', value: 'schedules' },
] as const

export function DashboardTaskSwitcher() {
  const [activeTab, setActiveTab] = useState<keyof typeof taskGroups>('todos')

  return (
    <Card className="flex h-full min-h-0 min-w-0 flex-col gap-0 py-0">
      <CardHeader className="px-4 pb-3 pt-4 sm:px-5">
        <div
          aria-label="任务类型"
          className="inline-flex w-fit rounded-lg bg-muted p-1"
          role="group"
        >
          {taskTabs.map(({ label, value }) => {
            const active = activeTab === value

            return (
              <button
                aria-pressed={active}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                key={value}
                onClick={() => setActiveTab(value)}
                type="button"
              >
                {label}
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 px-4 pb-4 sm:px-5">
        <ul className="grid h-full content-center gap-2">
          {taskGroups[activeTab].map((task) => (
            <li className="flex min-w-0 items-center gap-3" key={task.title}>
              <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span>
              <span className="hidden shrink-0 text-xs text-muted-foreground xl:inline">
                {task.meta}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
