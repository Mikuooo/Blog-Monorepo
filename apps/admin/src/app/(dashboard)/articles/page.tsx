import { Badge, type BadgeProps } from '@blog/ui/components/badge'
import { Button } from '@blog/ui/components/button'
import { Card, CardContent } from '@blog/ui/components/card'
import { Input } from '@blog/ui/components/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@blog/ui/components/table'
import type { Metadata } from 'next'

import { Icon } from '@/components/icons'
import { PageHeader } from '@/components/page-header'
import { articleFixtures, type ArticleStatus } from '@/features/articles/article-fixtures'

export const metadata: Metadata = { title: '文章管理' }

const statusMeta: Record<
  ArticleStatus,
  { label: string; variant: NonNullable<BadgeProps['variant']> }
> = {
  DRAFT: { label: '草稿', variant: 'secondary' },
  IN_REVIEW: { label: '审核中', variant: 'warning' },
  PUBLISHED: { label: '已发布', variant: 'success' },
  SCHEDULED: { label: '定时发布', variant: 'outline' },
}

type PageProps = { searchParams: Promise<{ keyword?: string; status?: string }> }

export default async function ArticlesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const keyword = params.keyword?.trim().toLocaleLowerCase('zh-CN') ?? ''
  const status = Object.hasOwn(statusMeta, params.status ?? '')
    ? (params.status as ArticleStatus)
    : ''
  const articles = articleFixtures.filter(
    (article) =>
      (!status || article.status === status) &&
      (!keyword ||
        `${article.title}${article.author}${article.category}`
          .toLocaleLowerCase('zh-CN')
          .includes(keyword)),
  )

  return (
    <>
      <PageHeader
        actions={
          <Button disabled title="文章编辑器将在下一批实现">
            <Icon className="size-4" name="plus" />
            新建文章
          </Button>
        }
        description="查看、筛选并管理全部内容。当前为类型化演示数据，真实服务端分页和权限将在 API 接入后启用。"
        eyebrow="Content"
        title="文章管理"
      />
      <Card>
        <CardContent className="pt-5 sm:pt-6">
          <form className="flex flex-col gap-3 lg:flex-row" method="get">
            <div className="relative flex-1">
              <label className="sr-only" htmlFor="article-keyword">
                搜索文章
              </label>
              <Icon
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                name="search"
              />
              <Input
                className="pl-9"
                defaultValue={params.keyword}
                id="article-keyword"
                name="keyword"
                placeholder="搜索标题、作者或分类"
              />
            </div>
            <label className="sr-only" htmlFor="article-status">
              文章状态
            </label>
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              defaultValue={status}
              id="article-status"
              name="status"
            >
              <option value="">全部状态</option>
              {Object.entries(statusMeta).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
            <Button type="submit">筛选</Button>
            <Button formAction="/articles" type="submit" variant="outline">
              重置
            </Button>
          </form>
        </CardContent>
        <div className="overflow-x-auto border-t">
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow>
                <TableHead>文章</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>作者</TableHead>
                <TableHead>阅读</TableHead>
                <TableHead>最后更新</TableHead>
                <TableHead className="w-16">
                  <span className="sr-only">操作</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.length ? (
                articles.map((article) => {
                  const meta = statusMeta[article.status]
                  return (
                    <TableRow key={article.id}>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="truncate font-semibold">{article.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {article.category} · {article.id}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell>{article.author}</TableCell>
                      <TableCell>{article.views.toLocaleString('zh-CN')}</TableCell>
                      <TableCell className="text-muted-foreground">{article.updatedAt}</TableCell>
                      <TableCell>
                        <Button aria-label={`管理《${article.title}》`} size="icon" variant="ghost">
                          <Icon className="size-5" name="more" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell className="h-44 text-center" colSpan={6}>
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="grid size-11 place-items-center rounded-xl bg-muted">
                        <Icon className="size-5 text-muted-foreground" name="search" />
                      </div>
                      <p className="mt-3 font-semibold">没有匹配的文章</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        请调整关键词或状态筛选条件。
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <footer className="flex flex-col gap-3 border-t px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>共 {articles.length} 条演示记录 · 第 1 页</p>
          <div className="flex gap-2">
            <Button disabled size="sm" variant="outline">
              上一页
            </Button>
            <Button disabled size="sm" variant="outline">
              下一页
            </Button>
          </div>
        </footer>
      </Card>
    </>
  )
}
