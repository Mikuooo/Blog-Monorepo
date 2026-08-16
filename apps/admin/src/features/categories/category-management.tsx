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
  CategoryApiError,
  createCategory,
  deleteCategory,
  type Category,
  type CategoryListQuery,
  updateCategory,
} from './category-api'
import { categoryKeys, useCategoryList } from './category-query'
import {
  categoryDefaults,
  categoryFormSchema,
  slugifyCategory,
  toCreateCategory,
  toUpdateCategory,
  type CategoryFormValues,
} from './category-schema'

export type CategoryPageParams = { keyword?: string; page?: string }

export function CategoryManagement({ params }: { params: CategoryPageParams }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const currentUser = useCurrentUser()
  const page = parsePage(params.page)
  const keyword = params.keyword?.trim() || undefined
  const query: CategoryListQuery = { page, pageSize: 20, ...(keyword ? { keyword } : {}) }
  const categories = useCategoryList(query)
  const options = useCategoryList({ page: 1, pageSize: 100 })
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const permissions = currentUser.data?.permissions ?? []
  const canCreate = permissions.includes('category.create')
  const canUpdate = permissions.includes('category.update')
  const canDelete = permissions.includes('category.delete')
  const remove = useMutation({
    mutationFn: deleteCategory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      setEditing(null)
    },
  })

  function goToPage(nextPage: number) {
    const search = new URLSearchParams()
    if (keyword) search.set('keyword', keyword)
    if (nextPage > 1) search.set('page', String(nextPage))
    router.push(`/categories${search.size ? `?${search.toString()}` : ''}`)
  }

  function confirmDelete(category: Category) {
    const detail = category.articleCount
      ? `该分类关联 ${category.articleCount} 篇文章，删除后文章仍保留但分类将不可选。`
      : '该分类没有关联文章。'
    if (!window.confirm(`${detail}\n确定删除分类“${category.name}”吗？`)) return
    remove.mutate(category.id)
  }

  return (
    <>
      <PageHeader
        actions={
          canCreate ? (
            <Button onClick={() => setEditing('new')}>
              <Icon className="size-4" name="plus" />
              新建分类
            </Button>
          ) : null
        }
        description="维护文章分类层级、访问别名和展示顺序。"
        eyebrow="Content"
        title="分类管理"
      />

      {editing ? (
        <CategoryEditor
          key={editing === 'new' ? 'new' : editing.id}
          categories={options.data?.items ?? []}
          onClose={() => setEditing(null)}
          {...(editing === 'new' ? {} : { category: editing })}
        />
      ) : null}

      {remove.isError ? <ErrorNotice error={remove.error} /> : null}

      <Card>
        <CardContent className="pt-5 sm:pt-6">
          <form className="flex flex-col gap-3 sm:flex-row" method="get">
            <div className="relative flex-1">
              <label className="sr-only" htmlFor="category-keyword">
                搜索分类
              </label>
              <Icon
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                name="search"
              />
              <Input
                className="pl-9"
                defaultValue={keyword}
                id="category-keyword"
                maxLength={120}
                name="keyword"
                placeholder="搜索名称或别名"
              />
            </div>
            <Button type="submit">搜索</Button>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-semibold shadow-sm hover:bg-muted"
              href="/categories"
            >
              重置
            </Link>
          </form>
        </CardContent>
        <div className="overflow-x-auto border-t">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>分类</TableHead>
                <TableHead>父分类</TableHead>
                <TableHead>文章</TableHead>
                <TableHead>子分类</TableHead>
                <TableHead>排序</TableHead>
                <TableHead className="w-44">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.isPending ? (
                <StateRow message="正在加载分类…" />
              ) : categories.isError ? (
                <StateRow
                  action={
                    <Button onClick={() => void categories.refetch()} size="sm" variant="outline">
                      重新加载
                    </Button>
                  }
                  message={categoryErrorMessage(categories.error)}
                />
              ) : categories.data.items.length ? (
                categories.data.items.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <p className="font-semibold">{category.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">/{category.slug}</p>
                    </TableCell>
                    <TableCell>{category.parent?.name ?? '顶级分类'}</TableCell>
                    <TableCell>{category.articleCount}</TableCell>
                    <TableCell>{category.childCount}</TableCell>
                    <TableCell>{category.sortOrder}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {canUpdate ? (
                          <Button onClick={() => setEditing(category)} size="sm" variant="outline">
                            编辑
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            disabled={remove.isPending || category.childCount > 0}
                            onClick={() => confirmDelete(category)}
                            size="sm"
                            title={category.childCount ? '请先移动或删除子分类' : undefined}
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
                <StateRow message="没有匹配的分类。" />
              )}
            </TableBody>
          </Table>
        </div>
        <Pagination
          page={page}
          result={categories.data}
          pending={categories.isPending}
          onPage={goToPage}
        />
      </Card>
    </>
  )
}

function CategoryEditor({
  category,
  categories,
  onClose,
}: {
  category?: Category
  categories: Category[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const form = useForm<CategoryFormValues>({
    defaultValues: categoryDefaults(category),
    resolver: zodResolver(categoryFormSchema),
  })
  const mutation = useMutation({
    mutationFn: (values: CategoryFormValues) =>
      category
        ? updateCategory(category.id, toUpdateCategory(values))
        : createCategory(toCreateCategory(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      onClose()
    },
  })
  return (
    <Card className="mb-5 border-primary/25">
      <CardHeader>
        <CardTitle>{category ? '编辑分类' : '新建分类'}</CardTitle>
        <CardDescription>分类别名用于 URL；中文名称需要手动填写英文或拼音别名。</CardDescription>
      </CardHeader>
      <CardContent>
        {mutation.isError ? <ErrorNotice error={mutation.error} /> : null}
        <form
          className="grid gap-4 md:grid-cols-2"
          noValidate
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <Field error={form.formState.errors.name?.message} id="category-name" label="名称">
            <Input
              id="category-name"
              maxLength={120}
              {...form.register('name', {
                onBlur: (event) => {
                  if (!form.getValues('slug'))
                    form.setValue('slug', slugifyCategory(event.target.value), {
                      shouldValidate: true,
                    })
                },
              })}
            />
          </Field>
          <Field error={form.formState.errors.slug?.message} id="category-slug" label="别名">
            <Input
              id="category-slug"
              maxLength={160}
              placeholder="engineering"
              {...form.register('slug')}
            />
          </Field>
          <Field
            error={form.formState.errors.parentId?.message}
            id="category-parent"
            label="父分类"
          >
            <select
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              id="category-parent"
              {...form.register('parentId')}
            >
              <option value="">顶级分类</option>
              {categories
                .filter((option) => option.id !== category?.id)
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field error={form.formState.errors.sortOrder?.message} id="category-sort" label="排序">
            <Input
              id="category-sort"
              type="number"
              {...form.register('sortOrder', { valueAsNumber: true })}
            />
          </Field>
          <Field
            className="md:col-span-2"
            error={form.formState.errors.description?.message}
            id="category-description"
            label="描述"
          >
            <textarea
              className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              id="category-description"
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
                if (!form.formState.isDirty || window.confirm('放弃未保存的分类修改？')) onClose()
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
      <TableCell className="h-40 text-center" colSpan={6}>
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
      {categoryErrorMessage(error)}
    </p>
  )
}
function Pagination({
  onPage,
  page,
  pending,
  result,
}: {
  onPage: (page: number) => void
  page: number
  pending: boolean
  result?: { total: number; totalPages: number } | undefined
}) {
  return (
    <footer className="flex items-center justify-between border-t px-5 py-4 text-sm text-muted-foreground">
      <p>
        共 {result?.total ?? 0} 条 · 第 {page} / {Math.max(result?.totalPages ?? 1, 1)} 页
      </p>
      <div className="flex gap-2">
        <Button
          disabled={pending || page <= 1}
          onClick={() => onPage(page - 1)}
          size="sm"
          variant="outline"
        >
          上一页
        </Button>
        <Button
          disabled={pending || page >= (result?.totalPages ?? 1)}
          onClick={() => onPage(page + 1)}
          size="sm"
          variant="outline"
        >
          下一页
        </Button>
      </div>
    </footer>
  )
}
function parsePage(value: string | undefined): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}
function categoryErrorMessage(error: unknown): string {
  if (!(error instanceof CategoryApiError)) return '分类操作失败，请稍后重试。'
  const messages: Record<string, string> = {
    CATEGORY_HAS_CHILDREN: '该分类仍有子分类，请先移动或删除子分类。',
    CATEGORY_PARENT_CYCLE: '不能将分类移动到自己的子级。',
    CATEGORY_PARENT_NOT_FOUND: '选择的父分类不存在或已删除。',
    CATEGORY_SLUG_EXISTS: '该分类别名已被使用。',
    NETWORK_ERROR: '无法连接后台 API。',
  }
  if (error.status === 401) return '登录状态已失效，请重新登录。'
  if (error.status === 403) return '当前账号没有执行此操作的权限。'
  return messages[error.code] ?? '分类操作失败，请稍后重试。'
}
