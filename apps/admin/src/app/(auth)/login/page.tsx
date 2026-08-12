import { Badge } from '@blog/ui/components/badge'
import { Button } from '@blog/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@blog/ui/components/card'
import { Input } from '@blog/ui/components/input'
import type { Metadata } from 'next'

import { Icon } from '@/components/icons'

export const metadata: Metadata = { title: '登录' }

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-slate-950 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden p-12 text-white lg:flex xl:p-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(57,197,187,0.32),transparent_34%),radial-gradient(circle_at_80%_70%,rgba(45,174,165,0.18),transparent_35%)]" />
        <div className="relative flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary font-black text-primary-foreground">
            B
          </div>
          <span className="font-semibold">Blog Platform</span>
        </div>
        <div className="relative max-w-xl">
          <Badge className="mb-6 border-white/15 bg-white/10 text-white" variant="outline">
            Editorial Workspace
          </Badge>
          <h1 className="text-5xl font-bold leading-tight tracking-tight xl:text-6xl">
            让每一次创作，
            <br />
            都有清晰的去处。
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            从灵感、草稿到发布，用一个安静、专注的工作台管理内容全生命周期。
          </p>
        </div>
        <p className="relative text-sm text-slate-400">© 2026 Blog Platform · 内容管理中心</p>
      </section>
      <section className="flex min-h-screen items-center justify-center bg-background px-5 py-12 sm:px-10">
        <Card className="w-full max-w-md border-0 shadow-xl shadow-slate-900/5">
          <CardHeader className="pb-4">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="grid size-10 place-items-center rounded-xl bg-primary font-black text-primary-foreground">
                B
              </div>
              <span className="font-semibold">Blog Platform</span>
            </div>
            <Badge className="mb-4 w-fit" variant="warning">
              界面演示模式
            </Badge>
            <CardTitle className="text-3xl">欢迎回来</CardTitle>
            <CardDescription>登录后进入内容管理工作台。本批尚未接入真实认证接口。</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/dashboard" className="space-y-5" method="get">
              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="email">
                  邮箱地址
                </label>
                <Input
                  autoComplete="email"
                  defaultValue="admin@blog.local"
                  id="email"
                  name="email"
                  required
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold" htmlFor="password">
                    密码
                  </label>
                  <span className="text-xs text-muted-foreground">认证功能下一批接入</span>
                </div>
                <Input
                  autoComplete="current-password"
                  id="password"
                  placeholder="输入任意演示密码"
                  required
                  type="password"
                />
              </div>
              <Button className="w-full" type="submit">
                进入演示工作台 <Icon className="size-4" name="arrow-up-right" />
              </Button>
            </form>
            <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
              继续即表示你已获授权访问管理后台。真实环境将由服务端验证身份与权限。
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
