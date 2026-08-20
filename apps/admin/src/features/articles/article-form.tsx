'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@blog/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@blog/ui/components/card'
import { Input } from '@blog/ui/components/input'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'

import { useCurrentUser } from '@/features/auth/auth-query'

import { ArticleApiError, createArticle, publishArticle } from './article-api'
import { ArticleCoverField } from './article-cover-field'
import { articleKeys } from './article-query'
import { ArticleRichTextEditor } from './article-rich-text-editor'
import {
  articleFormDefaults,
  articleFormSchema,
  slugifyTitle,
  toCreateArticleRequest,
  type ArticleFormValues,
} from './article-schema'
import { CategoryCascadeField, TagPickerField } from './article-taxonomy-fields'

const inputClassName =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50'

type SubmitIntent = 'draft' | 'publish'

class ArticlePublishAfterCreateError extends Error {
  constructor(
    readonly articleId: string,
    options: ErrorOptions,
  ) {
    super('ARTICLE_PUBLISH_AFTER_CREATE_FAILED', options)
    this.name = 'ArticlePublishAfterCreateError'
  }
}

export function ArticleForm() {
  const currentUser = useCurrentUser()
  const queryClient = useQueryClient()
  const router = useRouter()
  const form = useForm<ArticleFormValues>({
    defaultValues: articleFormDefaults,
    resolver: zodResolver(articleFormSchema),
  })
  const visibility = useWatch({ control: form.control, name: 'visibility' })
  const options = useWatch({
    control: form.control,
    name: ['allowComment', 'isPinned', 'isFeatured'],
  })
  const mutation = useMutation({
    mutationFn: async ({ intent, values }: { intent: SubmitIntent; values: ArticleFormValues }) => {
      const draft = await createArticle(toCreateArticleRequest(values))
      if (intent === 'draft') return { intent, result: draft }

      try {
        const result = await publishArticle(draft.articleId, draft.version)
        return { intent, result }
      } catch (error) {
        throw new ArticlePublishAfterCreateError(draft.articleId, { cause: error })
      }
    },
    onError: async (error) => {
      if (error instanceof ArticlePublishAfterCreateError) {
        await queryClient.invalidateQueries({ queryKey: articleKeys.all })
      }
    },
    onSuccess: async ({ result }) => {
      await queryClient.invalidateQueries({ queryKey: articleKeys.all })
      router.push(`/articles?created=${encodeURIComponent(result.articleId)}`)
      router.refresh()
    },
  })
  const canCreate = currentUser.data?.permissions.includes('article.create') ?? false
  const canPublish = currentUser.data?.permissions.includes('article.publish') ?? false
  const submitIntent = mutation.variables?.intent

  useEffect(() => {
    if (!form.formState.isDirty || mutation.isSuccess) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [form.formState.isDirty, mutation.isSuccess])

  if (!canCreate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>没有新建文章权限</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          当前账号缺少 article.create 权限。
        </CardContent>
      </Card>
    )
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => mutation.mutate({ intent: 'draft', values }))}
    >
      {mutation.isError ? (
        <p
          className="mb-5 rounded-lg border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {articleErrorMessage(mutation.error)}
        </p>
      ) : null}

      <div className="grid items-start gap-5 xl:h-[calc(100dvh-15rem)] xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-stretch 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5 xl:h-full xl:overflow-y-auto xl:overscroll-contain xl:pr-2">
          <Card>
            <CardContent className="space-y-4 p-4 pt-4 sm:p-5 sm:pt-5">
              <div className="grid gap-4 lg:grid-cols-[3fr_1fr_1fr]">
                <Field
                  error={form.formState.errors.title?.message}
                  id="title"
                  label="文章标题"
                  required
                >
                  <Input
                    id="title"
                    maxLength={240}
                    placeholder="输入文章标题"
                    {...form.register('title', {
                      onBlur: (event) => {
                        if (!form.getValues('slug'))
                          form.setValue('slug', slugifyTitle(event.target.value), {
                            shouldValidate: true,
                          })
                      },
                    })}
                  />
                </Field>
                <Field
                  error={form.formState.errors.slug?.message}
                  id="slug"
                  label="文章别名"
                  required
                >
                  <Input
                    id="slug"
                    maxLength={240}
                    placeholder="article-slug"
                    {...form.register('slug')}
                  />
                </Field>
                <Field
                  error={form.formState.errors.visibility?.message}
                  id="visibility"
                  label="可见性"
                >
                  <select
                    className={`${inputClassName} h-10`}
                    id="visibility"
                    {...form.register('visibility')}
                  >
                    <option value="PUBLIC">公开</option>
                    <option value="PRIVATE">私密</option>
                    <option value="PASSWORD">密码访问</option>
                  </select>
                </Field>
              </div>

              {visibility === 'PASSWORD' ? (
                <Field
                  error={form.formState.errors.password?.message}
                  id="password"
                  label="访问密码"
                  required
                >
                  <Input
                    id="password"
                    maxLength={128}
                    placeholder="至少 8 位"
                    type="password"
                    {...form.register('password')}
                  />
                </Field>
              ) : null}

              <Field error={form.formState.errors.summary?.message} id="summary" label="摘要">
                <textarea
                  className={`${inputClassName} min-h-24 resize-y`}
                  id="summary"
                  maxLength={5000}
                  placeholder="用于列表与分享卡片"
                  {...form.register('summary')}
                />
              </Field>
            </CardContent>
          </Card>

          <section aria-labelledby="article-content-heading">
            <div className="mb-3 flex items-center gap-1.5 px-1">
              <h2 className="text-sm font-semibold" id="article-content-heading">
                正文
              </h2>
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </div>
            <div className="article-editor-grid rounded-2xl border border-border p-3 sm:p-4">
              <Controller
                control={form.control}
                name="content"
                render={({ field, fieldState }) => (
                  <>
                    <ArticleRichTextEditor
                      initialValue={field.value}
                      invalid={Boolean(fieldState.error)}
                      onBlur={field.onBlur}
                      onChange={(value) => field.onChange(value)}
                    />
                    {fieldState.error ? (
                      <p className="mt-3 text-xs text-destructive" id="content-error">
                        {fieldState.error.message}
                      </p>
                    ) : null}
                  </>
                )}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-5 xl:h-full xl:overflow-y-auto xl:overscroll-contain xl:pl-1 xl:pr-2">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <Button disabled={mutation.isPending} type="submit" variant="outline">
              {mutation.isPending && submitIntent === 'draft' ? '正在保存…' : '保存草稿'}
            </Button>
            <Button
              disabled={mutation.isPending || !canPublish}
              onClick={form.handleSubmit((values) => mutation.mutate({ intent: 'publish', values }))}
              title={canPublish ? '创建文章并立即发布' : '当前账号缺少 article.publish 权限'}
              type="button"
            >
              {mutation.isPending && submitIntent === 'publish' ? '正在发布…' : '发布'}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>文章设置</CardTitle>
              <CardDescription>分类、标签、封面与展示方式。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Field error={form.formState.errors.categoryId?.message} id="categoryId" label="分类">
                <Controller
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <CategoryCascadeField onChange={field.onChange} value={field.value} />
                  )}
                />
              </Field>
              <Field error={form.formState.errors.tagIds?.message} id="tagIds" label="标签">
                <Controller
                  control={form.control}
                  name="tagIds"
                  render={({ field }) => (
                    <TagPickerField onChange={field.onChange} value={field.value} />
                  )}
                />
              </Field>
              <Field error={form.formState.errors.coverId?.message} id="coverId" label="封面">
                <Controller
                  control={form.control}
                  name="coverId"
                  render={({ field }) => (
                    <ArticleCoverField onChange={field.onChange} value={field.value} />
                  )}
                />
              </Field>
              <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-border">
                <OptionButton
                  active={options[0]}
                  label="允许评论"
                  onClick={() => form.setValue('allowComment', !options[0], { shouldDirty: true })}
                />
                <OptionButton
                  active={options[1]}
                  label="置顶文章"
                  onClick={() => form.setValue('isPinned', !options[1], { shouldDirty: true })}
                />
                <OptionButton
                  active={options[2]}
                  label="设为精选"
                  onClick={() => form.setValue('isFeatured', !options[2], { shouldDirty: true })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
              <CardDescription>搜索和社交分享信息。</CardDescription>
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
                error={form.formState.errors.canonicalUrl?.message}
                id="canonicalUrl"
                label="规范链接"
              >
                <Input
                  id="canonicalUrl"
                  inputMode="url"
                  placeholder="https://example.com/posts/article"
                  {...form.register('canonicalUrl')}
                />
              </Field>
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  )
}

function Field({
  children,
  error,
  id,
  label,
  required = false,
}: {
  children: ReactNode
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
      ) : null}
    </div>
  )
}

function OptionButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      aria-pressed={active}
      className={`min-h-11 border-r border-border px-2 text-xs font-semibold last:border-r-0 ${active ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-primary-soft'}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  )
}

export function articleErrorMessage(error: unknown): string {
  if (error instanceof ArticlePublishAfterCreateError)
    return '草稿已保存，但发布失败。请返回文章列表继续处理，避免重复创建。'
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
