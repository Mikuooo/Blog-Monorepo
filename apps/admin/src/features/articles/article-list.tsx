'use client'

import type { BadgeProps } from '@blog/ui/components/badge'
import { Badge } from '@blog/ui/components/badge'
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
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Icon } from '@/components/icons'
import { PageHeader } from '@/components/page-header'
import { useCurrentUser } from '@/features/auth/auth-query'

import { ArticleApiError, type ArticleListQuery } from './article-api'
import { useArticleList } from './article-query'

type ArticleStatus = NonNullable<ArticleListQuery['status']>

const statusMeta: Record<
  ArticleStatus,
  { label: string; variant: NonNullable<BadgeProps['variant']> }
> = {
  ARCHIVED: { label: '已归档', variant: 'secondary' },
  DRAFT: { label: '草稿', variant: 'secondary' },
  PUBLISHED: { label: '已发布', variant: 'success' },
  SCHEDULED: { label: '定时发布', variant: 'outline' },
}

export type ArticleListParams = {
  created?: string
  keyword?: string
  page?: string
  status?: string
}

export function ArticleList({ params }: { params: ArticleListParams }) {
  const router = useRouter()
  const currentUser = useCurrentUser()
  const page = parsePage(params.page)
  const status = isArticleStatus(params.status) ? params.status : undefined
  const keyword = params.keyword?.trim() || undefined
  const query: ArticleListQuery = {
    page,
    pageSize: 20,
    ...(keyword ? { keyword } : {}),
    ...(status ? { status } : {}),
  }
  const articles = useArticleList(query)
  const canCreate = currentUser.data?.permissions.includes('article.create') ?? false

  function goToPage(nextPage: number) {
    const search = new URLSearchParams()
    if (keyword) search.set('keyword', keyword)
    if (status) search.set('status', status)
    if (nextPage > 1) search.set('page', String(nextPage))
    router.push(`/articles${search.size ? `?${search.toString()}` : ''}`)
  }

  return (
    <>
      <PageHeader
        actions={
          canCreate ? (
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              href="/articles/new"
            >
              <Icon className="size-4" name="plus" />
              新建文章
            </Link>
          ) : null
        }
        description="查看、筛选并管理全部内容，列表数据来自后台文章 API。"
        eyebrow="Content"
        title="文章管理"
      />

      {params.created ? (
        <p
          className="mb-5 rounded-lg border border-success/25 bg-success/10 px-4 py-3 text-sm text-success"
          role="status"
        >
          文章草稿已保存，可在列表中继续管理。
        </p>
      ) : null}

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
                defaultValue={keyword}
                id="article-keyword"
                maxLength={120}
                name="keyword"
                placeholder="搜索标题或摘要"
              />
            </div>
            <label className="sr-only" htmlFor="article-status">
              文章状态
            </label>
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              defaultValue={status ?? ''}
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
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-semibold shadow-sm transition-colors hover:border-primary/35 hover:bg-primary-soft"
              href="/articles"
            >
              重置
            </Link>
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
              {articles.isPending ? (
                <StateRow message="正在加载文章…" />
              ) : articles.isError ? (
                <StateRow
                  action={
                    <Button onClick={() => void articles.refetch()} size="sm" variant="outline">
                      重新加载
                    </Button>
                  }
                  message={articleListErrorMessage(articles.error)}
                />
              ) : articles.data.items.length ? (
                articles.data.items.map((article) => {
                  const meta = statusMeta[article.status]
                  return (
                    <TableRow key={article.id}>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="truncate font-semibold">{article.title}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {article.category?.name ?? '未分类'} · /posts/{article.slug}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell>{article.author.displayName}</TableCell>
                      <TableCell>{formatCount(article.viewCount)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(article.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          aria-label={`管理《${article.title}》`}
                          disabled
                          size="icon"
                          title="文章编辑功能即将开放"
                          variant="ghost"
                        >
                          <Icon className="size-5" name="more" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <StateRow message="没有匹配的文章，请调整关键词或状态筛选条件。" />
              )}
            </TableBody>
          </Table>
        </div>

        <footer className="flex flex-col gap-3 border-t px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            共 {articles.data?.total ?? 0} 条记录 · 第 {articles.data?.page ?? page} /{' '}
            {Math.max(articles.data?.totalPages ?? 1, 1)} 页
          </p>
          <div className="flex gap-2">
            <Button
              disabled={articles.isPending || page <= 1}
              onClick={() => goToPage(page - 1)}
              size="sm"
              variant="outline"
            >
              上一页
            </Button>
            <Button
              disabled={articles.isPending || page >= (articles.data?.totalPages ?? 1)}
              onClick={() => goToPage(page + 1)}
              size="sm"
              variant="outline"
            >
              下一页
            </Button>
          </div>
        </footer>
      </Card>
    </>
  )
}

function StateRow({ action, message }: { action?: React.ReactNode; message: string }) {
  return (
    <TableRow>
      <TableCell className="h-44 text-center" colSpan={6}>
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-muted">
            <Icon className="size-5 text-muted-foreground" name="file-text" />
          </div>
          <p className="text-sm text-muted-foreground">{message}</p>
          {action}
        </div>
      </TableCell>
    </TableRow>
  )
}

function parsePage(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function isArticleStatus(value: string | undefined): value is ArticleStatus {
  return Boolean(value && Object.hasOwn(statusMeta, value))
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatCount(value: string): string {
  try {
    return BigInt(value).toLocaleString('zh-CN')
  } catch {
    return value
  }
}

function articleListErrorMessage(error: unknown): string {
  if (!(error instanceof ArticleApiError)) return '文章加载失败，请稍后重试。'
  if (error.status === 401) return '登录状态已失效，请重新登录。'
  if (error.status === 403) return '当前账号没有查看文章的权限。'
  if (error.code === 'NETWORK_ERROR') return '无法连接后台 API，请确认服务已启动。'
  return '文章加载失败，请稍后重试。'
}
