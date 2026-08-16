import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@blog/ui/components/card'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { RainEffect } from '@/components/effects/rain'
import { LoginForm } from '@/features/auth/login-form'

export const metadata: Metadata = { title: '登录' }

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-slate-950 lg:grid-cols-[1.1fr_0.9fr]">
      <RainEffect showWeatherLabel />
      <section className="relative z-10 hidden min-h-screen flex-col justify-between overflow-hidden p-12 text-white lg:flex xl:p-16">
        <div className="relative flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary font-black text-primary-foreground">
            B
          </div>
          <span className="font-semibold">Blog Platform</span>
        </div>

        <p className="relative text-sm text-slate-400">© 2026 Blog Platform · 内容管理中心</p>
      </section>
      <section className="relative z-10 flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <Card className="rain-login-card w-full max-w-md overflow-hidden border-white/35">
          <CardHeader className="pb-4">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="grid size-10 place-items-center rounded-xl bg-primary font-black text-primary-foreground">
                B
              </div>
              <span className="font-semibold text-foreground">Blog Platform</span>
            </div>
            <CardTitle className="text-3xl">欢迎来到梦世界</CardTitle>
            <CardDescription>使用管理员账号登录内容管理工作台。</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={
                <p className="py-3 text-center text-sm text-muted-foreground">正在准备登录…</p>
              }
            >
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
