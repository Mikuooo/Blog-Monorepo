'use client'

import { Button } from '@blog/ui/components/button'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState, useSyncExternalStore } from 'react'

import { Icon, type IconName } from './icons'

const navigation: Array<{ href: string; icon: IconName; label: string }> = [
  { href: '/dashboard', icon: 'dashboard', label: '工作台' },
  { href: '/articles', icon: 'file-text', label: '文章管理' },
  { href: '/categories', icon: 'folder', label: '分类管理' },
  { href: '/tags', icon: 'tag', label: '标签管理' },
  { href: '/comments', icon: 'message', label: '评论审核' },
  { href: '/media', icon: 'image', label: '媒体资源' },
  { href: '/users', icon: 'users', label: '用户权限' },
  { href: '/settings', icon: 'settings', label: '系统设置' },
]

type LayoutMode = 'inset' | 'classic'

const layoutStorageKey = 'admin-layout-mode'
const layoutChangeEvent = 'admin-layout-change'
const sidebarStorageKey = 'admin-sidebar-collapsed'
const sidebarChangeEvent = 'admin-sidebar-change'

function getLayoutSnapshot(): LayoutMode {
  return window.localStorage.getItem(layoutStorageKey) === 'classic' ? 'classic' : 'inset'
}

function subscribeToLayoutChange(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(layoutChangeEvent, onStoreChange)

  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(layoutChangeEvent, onStoreChange)
  }
}

function getSidebarSnapshot() {
  return window.localStorage.getItem(sidebarStorageKey) === 'true'
}

function subscribeToSidebarChange(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(sidebarChangeEvent, onStoreChange)

  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(sidebarChangeEvent, onStoreChange)
  }
}

function SidebarContent({
  close,
  collapsed = false,
  onToggleCollapse,
}: {
  close?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}) {
  const pathname = usePathname()
  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex h-16 items-center border-b transition-[padding] duration-300 ease-in-out ${collapsed ? 'justify-center px-2' : 'gap-2 px-3'}`}
      >
        <div
          className={`grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground transition-all duration-300 ease-in-out ${collapsed ? 'w-0 scale-75 overflow-hidden opacity-0' : 'w-9 scale-100 opacity-100'}`}
        >
          B
        </div>
        <div
          className={`min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${collapsed ? 'w-0 flex-none opacity-0' : 'flex-1 opacity-100'}`}
        >
          <p className="truncate text-sm font-bold leading-none">Blog Platform</p>
          <p className="mt-1 text-xs text-muted-foreground">内容管理中心</p>
        </div>
        {onToggleCollapse ? (
          <Button
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
            className="shrink-0"
            onClick={onToggleCollapse}
            size="icon"
            title={collapsed ? '展开侧边栏' : '收起侧边栏'}
            variant="ghost"
          >
            <Icon className="size-4" name="menu" />
          </Button>
        ) : null}
      </div>
      <nav
        className={`flex-1 space-y-1 overflow-y-auto ${collapsed ? 'p-2' : 'p-3'}`}
        aria-label="后台主导航"
      >
        <p
          className={`px-3 pb-2 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${collapsed ? 'sr-only' : ''}`}
        >
          管理菜单
        </p>
        {navigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const unavailable = !['/dashboard', '/articles'].includes(item.href)
          return unavailable ? (
            <span
              key={item.href}
              className={`flex min-h-11 items-center rounded-lg text-sm text-muted-foreground/65 ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'}`}
              title="后续批次开放"
            >
              <Icon className="size-5" name={item.icon} />
              <span className={collapsed ? 'sr-only' : ''}>{item.label}</span>
              {collapsed ? null : <span className="ml-auto text-[10px] font-semibold">即将开放</span>}
            </span>
          ) : (
            <Link
              key={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-11 items-center rounded-lg text-sm font-medium transition-colors ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-primary-soft hover:text-foreground'}`}
              href={item.href}
              title={collapsed ? item.label : undefined}
              {...(close ? { onClick: close } : {})}
            >
              <Icon className="size-5" name={item.icon} />
              <span className={collapsed ? 'sr-only' : ''}>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className={`border-t ${collapsed ? 'p-2' : 'p-3'}`}>
        <div
          className={`flex items-center rounded-xl bg-muted/70 ${collapsed ? 'justify-center p-2' : 'gap-3 p-3'}`}
          title={collapsed ? '内容管理员' : undefined}
        >
          <div className="grid size-9 place-items-center rounded-full bg-card text-primary-hover shadow-sm">
            <Icon className="size-5" name="user" />
          </div>
          <div className={collapsed ? 'sr-only' : 'min-w-0 flex-1'}>
            <p className="truncate text-sm font-semibold">内容管理员</p>
            <p className="truncate text-xs text-muted-foreground">admin@blog.local</p>
          </div>
          {collapsed ? null : <Icon className="size-4 text-muted-foreground" name="chevron-down" />}
        </div>
      </div>
    </div>
  )
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const layoutMode = useSyncExternalStore(subscribeToLayoutChange, getLayoutSnapshot, () => 'inset')
  const sidebarCollapsed = useSyncExternalStore(
    subscribeToSidebarChange,
    getSidebarSnapshot,
    () => false,
  )
  const inset = layoutMode === 'inset'
  const isDashboard = pathname === '/dashboard'

  function toggleLayout() {
    const nextLayout = inset ? 'classic' : 'inset'
    window.localStorage.setItem(layoutStorageKey, nextLayout)
    window.dispatchEvent(new Event(layoutChangeEvent))
  }

  function toggleSidebar() {
    window.localStorage.setItem(sidebarStorageKey, String(!sidebarCollapsed))
    window.dispatchEvent(new Event(sidebarChangeEvent))
  }

  return (
    <div className={inset ? 'min-h-screen bg-muted/40' : 'min-h-screen bg-background'}>
      <a
        className="fixed left-4 top-3 z-50 -translate-y-20 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:translate-y-0"
        href="#main-content"
      >
        跳到主要内容
      </a>
      <aside
        className={`fixed z-30 hidden bg-card transition-[width,inset,border-radius] duration-300 ease-in-out lg:block ${
          inset
            ? `inset-y-4 left-4 rounded-2xl border shadow-sm ${sidebarCollapsed ? 'w-16' : 'w-48'}`
            : `inset-y-0 left-0 border-r ${sidebarCollapsed ? 'w-16' : 'w-48'}`
        }`}
      >
        <SidebarContent collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="关闭导航遮罩"
            className="absolute inset-0 cursor-default bg-slate-950/45"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
          <aside
            className="relative h-full w-[min(19rem,85vw)] bg-card shadow-2xl"
            id="mobile-navigation"
          >
            <Button
              aria-label="关闭导航"
              className="absolute right-3 top-3 z-10"
              onClick={() => setMobileOpen(false)}
              size="icon"
              variant="ghost"
            >
              <Icon className="size-5" name="x" />
            </Button>
            <SidebarContent close={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}
      <div
        className={`transition-[margin,padding] duration-300 ease-in-out ${
          inset
            ? `p-3 sm:p-4 lg:pl-4 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-52'}`
            : sidebarCollapsed
              ? 'lg:pl-16'
              : 'lg:pl-48'
        }`}
      >
        <header
          className={`sticky z-20 flex h-16 items-center gap-3 bg-background/92 px-4 backdrop-blur sm:px-6 lg:px-8 ${
            inset ? 'top-3 rounded-2xl border shadow-sm sm:top-4' : 'top-0 border-b'
          }`}
        >
          <Button
            aria-controls="mobile-navigation"
            aria-expanded={mobileOpen}
            aria-label="打开导航"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            size="icon"
            variant="outline"
          >
            <Icon className="size-5" name="menu" />
          </Button>
          <div className="relative hidden max-w-md flex-1 md:block">
            <label className="sr-only" htmlFor="global-search">
              全局搜索
            </label>
            <Icon
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              name="search"
            />
            <input
              className="h-10 w-full rounded-lg border bg-card pl-9 pr-16 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              id="global-search"
              placeholder="搜索文章、评论或用户"
              type="search"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              ⌘ K
            </kbd>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              aria-label={inset ? '切换为全宽经典布局' : '切换为内嵌圆角布局'}
              onClick={toggleLayout}
              size="icon"
              title={inset ? '切换为全宽经典布局' : '切换为内嵌圆角布局'}
              variant="ghost"
            >
              <Icon className="size-5" name={inset ? 'menu' : 'dashboard'} />
            </Button>
            <Button aria-label="查看通知" size="icon" variant="ghost">
              <Icon className="size-5" name="bell" />
            </Button>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">内容管理员</p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
            <div className="grid size-9 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground">
              管
            </div>
          </div>
        </header>
        <main
          className={
            isDashboard
              ? 'w-full max-w-none pt-4'
              : `mx-auto max-w-[1600px] ${
                  inset ? 'px-1 pb-5 pt-7 sm:px-2 sm:pb-6 sm:pt-8 lg:px-4' : 'p-4 sm:p-6 lg:p-8'
                }`
          }
          id="main-content"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
