'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@blog/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@blog/ui/components/card'
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
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { Icon } from '@/components/icons'
import { PageHeader } from '@/components/page-header'
import { useCurrentUser } from '@/features/auth/auth-query'

import {
  createTag,
  deleteTag,
  TagApiError,
  type Tag,
  type TagListQuery,
  updateTag,
} from './tag-api'
import { tagKeys, useTagList } from './tag-query'
import {
  slugifyTag,
  tagDefaults,
  tagFormSchema,
  toCreateTag,
  toUpdateTag,
  type TagFormValues,
} from './tag-schema'

export type TagPageParams = { keyword?: string; page?: string }

export function TagManagement({ params }: { params: TagPageParams }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const currentUser = useCurrentUser()
  const page = parsePage(params.page)
  const keyword = params.keyword?.trim() || undefined
  const query: TagListQuery = { page, pageSize: 20, ...(keyword ? { keyword } : {}) }
  const tags = useTagList(query)
  const [editing, setEditing] = useState<Tag | 'new' | null>(null)
  const permissions = currentUser.data?.permissions ?? []
  const canCreate = permissions.includes('tag.create')
  const canUpdate = permissions.includes('tag.update')
  const canDelete = permissions.includes('tag.delete')
  const remove = useMutation({
    mutationFn: deleteTag,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tagKeys.all })
      setEditing(null)
    },
  })

  function goToPage(nextPage: number) {
    const search = new URLSearchParams()
    if (keyword) search.set('keyword', keyword)
    if (nextPage > 1) search.set('page', String(nextPage))
    router.push(`/tags${search.size ? `?${search.toString()}` : ''}`)
  }

  function confirmDelete(tag: Tag) {
    const impact = tag.articleCount
      ? `删除后会解除与 ${tag.articleCount} 篇文章的关联。`
      : '该标签没有关联文章。'
    if (window.confirm(`${impact}\n确定永久删除标签“${tag.name}”吗？`)) remove.mutate(tag.id)
  }

  return (
    <>
      <PageHeader
        actions={
          canCreate ? (
            <Button onClick={() => setEditing('new')}>
              <Icon className="size-4" name="plus" />
              新建标签
            </Button>
          ) : null
        }
        description="维护用于内容组织和检索的标签。"
        eyebrow="Content"
        title="标签管理"
      />
      {editing ? (
        <TagEditor
          key={editing === 'new' ? 'new' : editing.id}
          onClose={() => setEditing(null)}
          {...(editing === 'new' ? {} : { tag: editing })}
        />
      ) : null}
      {remove.isError ? <ErrorNotice error={remove.error} /> : null}
      <Card>
        <CardContent className="pt-5 sm:pt-6">
          <form className="flex flex-col gap-3 sm:flex-row" method="get">
            <div className="relative flex-1">
              <label className="sr-only" htmlFor="tag-keyword">
                搜索标签
              </label>
              <Icon
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                name="search"
              />
              <Input
                className="pl-9"
                defaultValue={keyword}
                id="tag-keyword"
                maxLength={120}
                name="keyword"
                placeholder="搜索名称或别名"
              />
            </div>
            <Button type="submit">搜索</Button>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-semibold shadow-sm hover:bg-muted"
              href="/tags"
            >
              重置
            </Link>
          </form>
        </CardContent>
        <div className="overflow-x-auto border-t">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>标签</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>关联文章</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead className="w-44">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.isPending ? (
                <StateRow message="正在加载标签…" />
              ) : tags.isError ? (
                <StateRow
                  action={
                    <Button onClick={() => void tags.refetch()} size="sm" variant="outline">
                      重新加载
                    </Button>
                  }
                  message={tagErrorMessage(tags.error)}
                />
              ) : tags.data.items.length ? (
                tags.data.items.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      <p className="font-semibold">{tag.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">/{tag.slug}</p>
                    </TableCell>
                    <TableCell className="max-w-sm truncate text-muted-foreground">
                      {tag.description || '—'}
                    </TableCell>
                    <TableCell>{tag.articleCount}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(tag.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {canUpdate ? (
                          <Button onClick={() => setEditing(tag)} size="sm" variant="outline">
                            编辑
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            disabled={remove.isPending}
                            onClick={() => confirmDelete(tag)}
                            size="sm"
                            variant="ghost"
                          >
                            删除
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <StateRow message="没有匹配的标签。" />
              )}
            </TableBody>
          </Table>
        </div>
        <footer className="flex items-center justify-between border-t px-5 py-4 text-sm text-muted-foreground">
          <p>
            共 {tags.data?.total ?? 0} 条 · 第 {page} / {Math.max(tags.data?.totalPages ?? 1, 1)} 页
          </p>
          <div className="flex gap-2">
            <Button
              disabled={tags.isPending || page <= 1}
              onClick={() => goToPage(page - 1)}
              size="sm"
              variant="outline"
            >
              上一页
            </Button>
            <Button
              disabled={tags.isPending || page >= (tags.data?.totalPages ?? 1)}
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

function TagEditor({ onClose, tag }: { onClose: () => void; tag?: Tag | undefined }) {
  const queryClient = useQueryClient()
  const form = useForm<TagFormValues>({
    defaultValues: tagDefaults(tag),
    resolver: zodResolver(tagFormSchema),
  })
  const mutation = useMutation({
    mutationFn: (values: TagFormValues) =>
      tag ? updateTag(tag.id, toUpdateTag(values)) : createTag(toCreateTag(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tagKeys.all })
      onClose()
    },
  })
  return (
    <Card className="mb-5 border-primary/25">
      <CardHeader>
        <CardTitle>{tag ? '编辑标签' : '新建标签'}</CardTitle>
        <CardDescription>
          标签名称可使用中文，访问别名仅支持小写字母、数字和连字符。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mutation.isError ? <ErrorNotice error={mutation.error} /> : null}
        <form
          className="grid gap-4 md:grid-cols-2"
          noValidate
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <Field error={form.formState.errors.name?.message} id="tag-name" label="名称">
            <Input
              id="tag-name"
              maxLength={120}
              {...form.register('name', {
                onBlur: (event) => {
                  if (!form.getValues('slug'))
                    form.setValue('slug', slugifyTag(event.target.value), { shouldValidate: true })
                },
              })}
            />
          </Field>
          <Field error={form.formState.errors.slug?.message} id="tag-slug" label="别名">
            <Input
              id="tag-slug"
              maxLength={160}
              placeholder="postgresql"
              {...form.register('slug')}
            />
          </Field>
          <Field
            className="md:col-span-2"
            error={form.formState.errors.description?.message}
            id="tag-description"
            label="描述"
          >
            <textarea
              className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              id="tag-description"
              maxLength={2000}
              {...form.register('description')}
            />
          </Field>
          <div className="flex gap-3 md:col-span-2">
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending ? '正在保存…' : '保存'}
            </Button>
            <Button
              onClick={() => {
                if (!form.formState.isDirty || window.confirm('放弃未保存的标签修改？')) onClose()
              }}
              type="button"
              variant="outline"
            >
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function Field({
  children,
  className,
  error,
  id,
  label,
}: {
  children: React.ReactNode
  className?: string | undefined
  error?: string | undefined
  id: string
  label: string
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-destructive" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
function StateRow({ action, message }: { action?: React.ReactNode; message: string }) {
  return (
    <TableRow>
      <TableCell className="h-40 text-center" colSpan={5}>
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">{message}</p>
          {action}
        </div>
      </TableCell>
    </TableRow>
  )
}
function ErrorNotice({ error }: { error: unknown }) {
  return (
    <p
      className="mb-4 rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      role="alert"
    >
      {tagErrorMessage(error)}
    </p>
  )
}
function parsePage(value: string | undefined): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}
function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}
function tagErrorMessage(error: unknown): string {
  if (!(error instanceof TagApiError)) return '标签操作失败，请稍后重试。'
  const messages: Record<string, string> = {
    NETWORK_ERROR: '无法连接后台 API。',
    TAG_NAME_EXISTS: '该标签名称已被使用。',
    TAG_SLUG_EXISTS: '该标签别名已被使用。',
  }
  if (error.status === 401) return '登录状态已失效，请重新登录。'
  if (error.status === 403) return '当前账号没有执行此操作的权限。'
  return messages[error.code] ?? '标签操作失败，请稍后重试。'
}
