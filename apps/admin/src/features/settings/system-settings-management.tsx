'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@blog/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@blog/ui/components/card'
import { Input } from '@blog/ui/components/input'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { PageHeader } from '@/components/page-header'
import { useCurrentUser } from '@/features/auth/auth-query'

import { updateSettings } from './settings-api'
import type { SystemSettings } from './settings-api'
import { settingsErrorMessage } from './settings-error'
import { settingsKeys, useSystemSettings } from './settings-query'
import {
  settingsFormDefaults,
  settingsFormSchema,
  toUpdateSettings,
  type SettingsFormValues,
} from './settings-schema'

const controlClassName =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50'

export function SystemSettingsManagement() {
  const currentUser = useCurrentUser()
  const permissions = currentUser.data?.permissions ?? []
  const canRead = permissions.includes('setting.read')
  const canUpdate = permissions.includes('setting.update')
  const settings = useSystemSettings(currentUser.isSuccess && canRead)

  return (
    <>
      <PageHeader
        description="集中维护站点品牌、搜索展示和内容默认值。所有修改均由后台权限校验并记录审计。"
        eyebrow="Configuration"
        title="系统设置"
      />

      {currentUser.isPending || (canRead && settings.isPending) ? (
        <StateCard title="正在加载系统设置…" description="正在读取当前站点配置。" />
      ) : currentUser.isError ? (
        <StateCard title="身份信息加载失败" description="请刷新页面或重新登录后再试。" />
      ) : !canRead ? (
        <StateCard
          title="没有查看系统设置的权限"
          description="当前账号缺少 setting.read 权限，请联系管理员授权。"
        />
      ) : settings.isError ? (
        <StateCard
          action={
            <Button onClick={() => void settings.refetch()} size="sm" variant="outline">
              重新加载
            </Button>
          }
          title="系统设置加载失败"
          description={settingsErrorMessage(settings.error, 'load')}
        />
      ) : settings.data ? (
        <SettingsForm canUpdate={canUpdate} settings={settings.data} />
      ) : null}
    </>
  )
}

function SettingsForm({ canUpdate, settings }: { canUpdate: boolean; settings: SystemSettings }) {
  const queryClient = useQueryClient()
  const form = useForm<SettingsFormValues>({
    defaultValues: settingsFormDefaults(settings),
    resolver: zodResolver(settingsFormSchema),
  })
  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(settingsKeys.detail(), updated)
      form.reset(settingsFormDefaults(updated))
    },
  })

  useEffect(() => {
    if (!form.formState.isDirty || mutation.isSuccess) return
    const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warnAboutUnsavedChanges)
    return () => window.removeEventListener('beforeunload', warnAboutUnsavedChanges)
  }, [form.formState.isDirty, mutation.isSuccess])

  return (
    <form
      className="space-y-5"
      noValidate
      onChange={() => mutation.reset()}
      onSubmit={form.handleSubmit((values) => mutation.mutate(toUpdateSettings(values)))}
    >
      {!canUpdate ? (
        <Notice variant="warning">
          当前账号只有查看权限。需要 setting.update 权限才能保存修改。
        </Notice>
      ) : null}
      {mutation.isError ? (
        <Notice variant="error">{settingsErrorMessage(mutation.error, 'update')}</Notice>
      ) : mutation.isSuccess ? (
        <Notice variant="success">系统设置已保存，审计记录已生成。</Notice>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>基础设置</CardTitle>
            <CardDescription>设置站点名称、公开描述和品牌资源链接。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field
              error={form.formState.errors.basic?.siteName?.message}
              id="siteName"
              label="站点名称"
              required
            >
              <Input id="siteName" maxLength={160} {...form.register('basic.siteName')} />
            </Field>
            <Field
              error={form.formState.errors.basic?.siteDescription?.message}
              id="siteDescription"
              label="站点描述"
            >
              <textarea
                className={`${controlClassName} min-h-24 resize-y`}
                id="siteDescription"
                maxLength={500}
                {...form.register('basic.siteDescription')}
              />
            </Field>
            <Field
              description="站点公开访问地址，需包含 http 或 https。"
              error={form.formState.errors.basic?.siteUrl?.message}
              id="siteUrl"
              label="站点 URL"
            >
              <Input
                id="siteUrl"
                inputMode="url"
                placeholder="https://example.com"
                {...form.register('basic.siteUrl')}
              />
            </Field>
            <Field
              error={form.formState.errors.basic?.logoUrl?.message}
              id="logoUrl"
              label="Logo URL"
            >
              <Input
                id="logoUrl"
                inputMode="url"
                placeholder="https://example.com/logo.svg"
                {...form.register('basic.logoUrl')}
              />
            </Field>
            <Field
              error={form.formState.errors.basic?.faviconUrl?.message}
              id="faviconUrl"
              label="Favicon URL"
            >
              <Input
                id="faviconUrl"
                inputMode="url"
                placeholder="https://example.com/favicon.ico"
                {...form.register('basic.faviconUrl')}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO 设置</CardTitle>
            <CardDescription>作为页面没有独立 SEO 信息时的默认展示内容。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field
              error={form.formState.errors.seo?.defaultTitle?.message}
              id="defaultTitle"
              label="默认标题"
            >
              <Input id="defaultTitle" maxLength={240} {...form.register('seo.defaultTitle')} />
            </Field>
            <Field
              error={form.formState.errors.seo?.defaultDescription?.message}
              id="defaultDescription"
              label="默认描述"
            >
              <textarea
                className={`${controlClassName} min-h-28 resize-y`}
                id="defaultDescription"
                maxLength={500}
                {...form.register('seo.defaultDescription')}
              />
            </Field>
            <Field
              description="使用逗号或换行分隔，最多 20 个。"
              error={form.formState.errors.seo?.keywords?.message}
              id="keywords"
              label="默认关键词"
            >
              <textarea
                className={`${controlClassName} min-h-24 resize-y`}
                id="keywords"
                placeholder="TypeScript, CMS, Engineering"
                {...form.register('seo.keywords')}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>内容设置</CardTitle>
            <CardDescription>定义内容工作流和前台列表使用的默认参数。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Field
              description="允许范围为 10–100。"
              error={form.formState.errors.content?.articlesPerPage?.message}
              id="articlesPerPage"
              label="每页文章数"
            >
              <Input
                id="articlesPerPage"
                max={100}
                min={10}
                type="number"
                {...form.register('content.articlesPerPage', { valueAsNumber: true })}
              />
            </Field>
            <Field
              description="新内容工作流建议采用的初始状态。"
              error={form.formState.errors.content?.defaultArticleStatus?.message}
              id="defaultArticleStatus"
              label="默认文章状态"
            >
              <select
                className={`${controlClassName} h-10`}
                id="defaultArticleStatus"
                {...form.register('content.defaultArticleStatus')}
              >
                <option value="DRAFT">草稿</option>
                <option value="PUBLISHED">已发布</option>
              </select>
            </Field>
            <div className="flex items-center rounded-xl border bg-muted/25 px-4 py-3">
              <Checkbox
                description="控制内容工作流是否默认开启评论。"
                label="默认允许评论"
                {...form.register('content.commentsEnabled')}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col-reverse justify-between gap-3 rounded-xl border bg-card px-4 py-4 shadow-sm sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground">
          {settings.updatedAt
            ? `上次保存：${formatDate(settings.updatedAt)}`
            : '尚未保存过自定义设置'}
        </p>
        <div className="flex gap-3">
          <Button
            disabled={!form.formState.isDirty || mutation.isPending}
            onClick={() => {
              form.reset(settingsFormDefaults(settings))
              mutation.reset()
            }}
            type="button"
            variant="outline"
          >
            撤销修改
          </Button>
          <Button
            disabled={!canUpdate || !form.formState.isDirty || mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? '正在保存…' : '保存设置'}
          </Button>
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

function Checkbox({
  description,
  label,
  ...props
}: React.ComponentProps<'input'> & { description: string; label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input
        className="mt-0.5 size-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        type="checkbox"
        {...props}
      />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

function Notice({
  children,
  variant,
}: {
  children: ReactNode
  variant: 'error' | 'success' | 'warning'
}) {
  const classes = {
    error: 'border-destructive/25 bg-destructive/10 text-destructive',
    success: 'border-success/30 bg-success/10 text-success',
    warning: 'border-warning/35 bg-warning/10 text-foreground',
  }
  return (
    <p
      className={`rounded-lg border px-4 py-3 text-sm ${classes[variant]}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      {children}
    </p>
  )
}

function StateCard({
  action,
  description,
  title,
}: {
  action?: ReactNode
  description: string
  title: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  )
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
