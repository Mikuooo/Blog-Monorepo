'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@blog/ui/components/button'
import { Input } from '@blog/ui/components/input'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { Icon } from '@/components/icons'

import { AuthApiError, login } from './auth-api'
import { authKeys, useCurrentUser } from './auth-query'
import { loginSchema, resolvePostLoginPath, type LoginValues } from './auth-schema'

export function LoginForm() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const destination = resolvePostLoginPath(searchParams.get('next'))
  const currentUser = useCurrentUser()
  const form = useForm<LoginValues>({
    defaultValues: { identifier: '', password: '' },
    resolver: zodResolver(loginSchema),
  })
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async ({ user }) => {
      queryClient.setQueryData(authKeys.currentUser(), user)
      router.replace(destination)
      router.refresh()
    },
  })

  useEffect(() => {
    if (!currentUser.data) return
    router.replace(destination)
  }, [currentUser.data, destination, router])

  const submitting = loginMutation.isPending

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
    >
      {loginMutation.isError ? (
        <p
          className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          role="alert"
        >
          {loginErrorMessage(loginMutation.error)}
        </p>
      ) : null}
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="identifier">
          邮箱或用户名
        </label>
        <Input
          aria-describedby={form.formState.errors.identifier ? 'identifier-error' : undefined}
          aria-invalid={Boolean(form.formState.errors.identifier)}
          autoComplete="username"
          id="identifier"
          maxLength={320}
          {...form.register('identifier', { onChange: () => loginMutation.reset() })}
        />
        {form.formState.errors.identifier ? (
          <p className="text-xs text-destructive" id="identifier-error">
            {form.formState.errors.identifier.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="password">
          密码
        </label>
        <Input
          aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
          aria-invalid={Boolean(form.formState.errors.password)}
          autoComplete="current-password"
          id="password"
          maxLength={128}
          type="password"
          {...form.register('password', { onChange: () => loginMutation.reset() })}
        />
        {form.formState.errors.password ? (
          <p className="text-xs text-destructive" id="password-error">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>
      <Button className="w-full" disabled={submitting || currentUser.isPending} type="submit">
        {submitting ? '正在登录…' : '登录并进入工作台'}
        {submitting ? null : <Icon className="size-4" name="arrow-up-right" />}
      </Button>
    </form>
  )
}

export function loginErrorMessage(error: unknown): string {
  if (!(error instanceof AuthApiError)) return '登录失败，请稍后重试。'
  if (error.code === 'INVALID_CREDENTIALS') return '账号或密码错误，请重新输入。'
  if (error.code === 'UNTRUSTED_ORIGIN') return '当前后台地址未被认证服务信任。'
  if (error.code === 'NETWORK_ERROR') return '无法连接认证服务，请确认后台 API 已启动。'
  return '登录失败，请稍后重试。'
}
