'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@blog/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@blog/ui/components/card'
import { Input } from '@blog/ui/components/input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { useCurrentUser } from '@/features/auth/auth-query'

import { ArticleApiError, createArticle } from './article-api'
import { articleKeys } from './article-query'
import {
  articleFormDefaults,
  articleFormSchema,
  slugifyTitle,
  toCreateArticleRequest,
  type ArticleFormValues,
} from './article-schema'

const inputClassName =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50'

export function ArticleForm() {
  const currentUser = useCurrentUser()
  const queryClient = useQueryClient()
  const router = useRouter()
  const form = useForm<ArticleFormValues>({
    defaultValues: articleFormDefaults,
    resolver: zodResolver(articleFormSchema),
  })
  const visibility = useWatch({ control: form.control, name: 'visibility' })
  const mutation = useMutation({
    mutationFn: createArticle,
    onSuccess: async ({ articleId }) => {
      await queryClient.invalidateQueries({ queryKey: articleKeys.all })
      router.push(`/articles?created=${encodeURIComponent(articleId)}`)
      router.refresh()
    },
  })
  const canCreate = currentUser.data?.permissions.includes('article.create') ?? false

  useEffect(() => {
    if (!form.formState.isDirty || mutation.isSuccess) return

    const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warnAboutUnsavedChanges)
    return () => window.removeEventListener('beforeunload', warnAboutUnsavedChanges)
  }, [form.formState.isDirty, mutation.isSuccess])

  if (!canCreate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>没有新建文章权限</CardTitle>
          <CardDescription>当前账号缺少 article.create 权限，请联系管理员授权。</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className="text-sm font-semibold text-primary hover:underline" href="/articles">
            返回文章管理
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <form
      className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"
      noValidate
      onSubmit={form.handleSubmit((values) => mutation.mutate(toCreateArticleRequest(values)))}
    >
      <div className="space-y-5">
        {mutation.isError ? (
          <p
            className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {articleErrorMessage(mutation.error)}
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>文章内容</CardTitle>
            <CardDescription>填写标题、访问路径和正文。正文支持 Markdown 内容。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field
              label="文章标题"
              required
              error={form.formState.errors.title?.message}
              id="title"
            >
              <Input
                aria-describedby={form.formState.errors.title ? 'title-error' : undefined}
                aria-invalid={Boolean(form.formState.errors.title)}
                id="title"
                maxLength={240}
                placeholder="输入清晰、易读的文章标题"
                {...form.register('title', {
                  onBlur: (event) => {
                    if (!form.getValues('slug')) {
                      form.setValue('slug', slugifyTitle(event.target.value), {
                        shouldValidate: true,
                      })
                    }
                  },
                  onChange: () => mutation.reset(),
                })}
              />
            </Field>

            <Field
              description="用于文章 URL，例如 getting-started。中文标题需要手动填写。"
              error={form.formState.errors.slug?.message}
              id="slug"
              label="文章别名"
              required
            >
              <div className="flex items-center rounded-lg border border-input bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                <span className="shrink-0 pl-3 text-sm text-muted-foreground">/posts/</span>
                <input
                  aria-describedby={form.formState.errors.slug ? 'slug-error' : undefined}
                  aria-invalid={Boolean(form.formState.errors.slug)}
                  className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none"
                  id="slug"
                  maxLength={240}
                  placeholder="article-slug"
                  {...form.register('slug', { onChange: () => mutation.reset() })}
                />
              </div>
            </Field>

            <Field
              description="用于列表和分享卡片，可留空。"
              error={form.formState.errors.summary?.message}
              id="summary"
              label="摘要"
            >
              <textarea
                aria-describedby={form.formState.errors.summary ? 'summary-error' : undefined}
                aria-invalid={Boolean(form.formState.errors.summary)}
                className={`${inputClassName} min-h-24 resize-y`}
                id="summary"
                maxLength={5000}
                placeholder="简要说明文章内容"
                {...form.register('summary')}
              />
            </Field>

            <Field
              error={form.formState.errors.content?.message}
              id="content"
              label="正文"
              required
            >
              <textarea
                aria-describedby={form.formState.errors.content ? 'content-error' : undefined}
                aria-invalid={Boolean(form.formState.errors.content)}
                className={`${inputClassName} min-h-[420px] resize-y font-mono leading-6`}
                id="content"
                placeholder="使用 Markdown 编写文章正文…"
                {...form.register('content')}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>搜索与分享</CardTitle>
            <CardDescription>未填写时将使用文章标题和摘要。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field error={form.formState.errors.seoTitle?.message} id="seoTitle" label="SEO 标题">
              <Input id="seoTitle" maxLength={240} {...form.register('seoTitle')} />
            </Field>
            <Field
              error={form.formState.errors.seoDescription?.message}
              id="seoDescription"
              label="SEO 描述"
            >
              <textarea
                className={`${inputClassName} min-h-24 resize-y`}
                id="seoDescription"
                maxLength={500}
                {...form.register('seoDescription')}
              />
            </Field>
            <Field
              description="声明内容的首选公开地址。"
              error={form.formState.errors.canonicalUrl?.message}
              id="canonicalUrl"
              label="规范链接"
            >
              <Input
                aria-describedby={
                  form.formState.errors.canonicalUrl ? 'canonicalUrl-error' : undefined
                }
                aria-invalid={Boolean(form.formState.errors.canonicalUrl)}
                id="canonicalUrl"
                inputMode="url"
                placeholder="https://example.com/posts/article"
                {...form.register('canonicalUrl')}
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5 xl:sticky xl:top-5">
        <Card>
          <CardHeader>
            <CardTitle>发布设置</CardTitle>
            <CardDescription>新文章将以草稿状态保存。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field error={form.formState.errors.visibility?.message} id="visibility" label="可见性">
              <select
                aria-describedby={form.formState.errors.visibility ? 'visibility-error' : undefined}
                aria-invalid={Boolean(form.formState.errors.visibility)}
                className={`${inputClassName} h-10`}
                id="visibility"
                {...form.register('visibility')}
              >
                <option value="PUBLIC">公开</option>
                <option value="PRIVATE">私密</option>
                <option value="PASSWORD">密码访问</option>
              </select>
            </Field>
            {visibility === 'PASSWORD' ? (
              <Field
                error={form.formState.errors.password?.message}
                id="password"
                label="访问密码"
                required
              >
                <Input
                  aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
                  aria-invalid={Boolean(form.formState.errors.password)}
                  autoComplete="new-password"
                  id="password"
                  maxLength={128}
                  placeholder="至少 8 位"
                  type="password"
                  {...form.register('password')}
                />
              </Field>
            ) : null}
            <div className="space-y-3 border-t pt-4">
              <Checkbox label="允许评论" {...form.register('allowComment')} />
              <Checkbox label="置顶文章" {...form.register('isPinned')} />
              <Checkbox label="设为精选" {...form.register('isFeatured')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>高级关联</CardTitle>
            <CardDescription>仅在已有资源 UUID 时填写。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field
              error={form.formState.errors.categoryId?.message}
              id="categoryId"
              label="分类 UUID"
            >
              <Input
                aria-describedby={form.formState.errors.categoryId ? 'categoryId-error' : undefined}
                aria-invalid={Boolean(form.formState.errors.categoryId)}
                id="categoryId"
                placeholder="可选"
                {...form.register('categoryId')}
              />
            </Field>
            <Field error={form.formState.errors.coverId?.message} id="coverId" label="封面 UUID">
              <Input
                aria-describedby={form.formState.errors.coverId ? 'coverId-error' : undefined}
                aria-invalid={Boolean(form.formState.errors.coverId)}
                id="coverId"
                placeholder="可选"
                {...form.register('coverId')}
              />
            </Field>
            <Field
              description="多个 UUID 使用逗号或换行分隔。"
              error={form.formState.errors.tagIds?.message}
              id="tagIds"
              label="标签 UUID"
            >
              <textarea
                aria-describedby={form.formState.errors.tagIds ? 'tagIds-error' : undefined}
                aria-invalid={Boolean(form.formState.errors.tagIds)}
                className={`${inputClassName} min-h-20 resize-y font-mono text-xs`}
                id="tagIds"
                placeholder="可选"
                {...form.register('tagIds')}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button className="flex-1" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? '正在保存…' : '保存草稿'}
          </Button>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-semibold shadow-sm transition-colors hover:border-primary/35 hover:bg-primary-soft"
            href="/articles"
            onClick={(event) => {
              if (form.formState.isDirty && !window.confirm('当前文章尚未保存，确定要离开吗？')) {
                event.preventDefault()
              }
            }}
          >
            取消
          </Link>
        </div>
      </div>
    </form>
  )
}

function Field({
  children,
  description,
  error,
  id,
  label,
  required = false,
}: {
  children: ReactNode
  description?: string
  error?: string | undefined
  id: string
  label: string
  required?: boolean
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold" htmlFor={id}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" id={`${id}-error`}>
          {error}
        </p>
      ) : description ? (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

function Checkbox({ label, ...props }: React.ComponentProps<'input'> & { label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
      <input
        className="size-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        type="checkbox"
        {...props}
      />
      {label}
    </label>
  )
}

export function articleErrorMessage(error: unknown): string {
  if (!(error instanceof ArticleApiError)) return '文章保存失败，请稍后重试。'
  if (error.code === 'ARTICLE_SLUG_EXISTS') return '文章别名已被使用，请更换后重试。'
  if (error.code === 'ARTICLE_PASSWORD_REQUIRED') return '密码可见文章必须设置访问密码。'
  if (error.code === 'ARTICLE_CATEGORY_NOT_FOUND') return '选择的分类不存在或已被删除。'
  if (error.code === 'ARTICLE_COVER_NOT_FOUND') return '选择的封面不存在或不可用。'
  if (error.code === 'ARTICLE_TAG_NOT_FOUND') return '一个或多个标签不存在或已被删除。'
  if (error.status === 401) return '登录状态已失效，请重新登录。'
  if (error.status === 403) return '当前账号没有新建文章权限。'
  if (error.code === 'NETWORK_ERROR') return '无法连接后台 API，请确认服务已启动。'
  return '文章保存失败，请检查填写内容后重试。'
}
