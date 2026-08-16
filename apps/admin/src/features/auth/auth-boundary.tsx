'use client'

import { Button } from '@blog/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@blog/ui/components/card'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

import { useCurrentUser } from './auth-query'

export function AuthBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const currentUser = useCurrentUser()

  useEffect(() => {
    if (currentUser.data !== null) return
    const loginUrl = `/login?next=${encodeURIComponent(pathname)}`
    router.replace(loginUrl)
  }, [currentUser.data, pathname, router])

  if (currentUser.isPending || currentUser.data === null) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/40 px-5">
        <div aria-live="polite" className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="size-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          正在验证登录状态…
        </div>
      </main>
    )
  }

  if (currentUser.isError) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/40 px-5">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>暂时无法验证登录状态</CardTitle>
            <CardDescription>认证服务当前不可用，请检查后台 API 是否已启动。</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => void currentUser.refetch()}>
              重新连接
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return children
}
