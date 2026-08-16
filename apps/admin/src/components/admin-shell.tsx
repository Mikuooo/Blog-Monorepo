'use client'

import { Button } from '@blog/ui/components/button'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useState, useSyncExternalStore } from 'react'

import { LogoutButton } from '@/features/auth/logout-button'
import { useCurrentUser } from '@/features/auth/auth-query'

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

const breadcrumbShadow =
  'drop-shadow(0 0 0.5px rgb(45 174 165 / 0.55)) drop-shadow(0 2px 3px rgb(15 23 42 / 0.12))'

type LayoutMode = 'inset' | 'classic'
type NavigationItem = (typeof navigation)[number]
type BreadcrumbTransition = {
  item: NavigationItem | undefined
  phase: 'idle' | 'entering' | 'exiting'
}

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
  itemCards = false,
  onToggleCollapse,
}: {
  close?: () => void
  collapsed?: boolean
  itemCards?: boolean
  onToggleCollapse?: () => void
}) {
  const pathname = usePathname()
  const currentUser = useCurrentUser()
  const displayName = currentUser.data?.displayName || '内容管理员'
  const email = currentUser.data?.email || 'admin@blog.local'

  function renderNavigationItem(item: NavigationItem) {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
    const unavailable = !['/dashboard', '/articles', '/categories', '/tags', '/users'].includes(
      item.href,
    )

    return unavailable ? (
      <span
        key={item.href}
        className={`flex min-h-11 items-center rounded-lg text-sm text-muted-foreground/65 ${
          collapsed ? 'justify-center px-2' : 'gap-3 px-3'
        } ${itemCards ? 'bg-card/55 ring-1 ring-border/40' : ''}`}
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
        className={`flex min-h-11 items-center rounded-lg text-sm font-medium transition-[color,background-color,box-shadow] ${
          collapsed ? 'justify-center px-2' : 'gap-3 px-3'
        } ${
          active
            ? 'bg-primary text-primary-foreground shadow-sm'
            : itemCards
              ? 'bg-card/85 text-muted-foreground shadow-sm ring-1 ring-border/45 hover:bg-primary-soft hover:text-foreground'
              : 'text-muted-foreground hover:bg-primary-soft hover:text-foreground'
        }`}
        href={item.href}
        title={collapsed ? item.label : undefined}
        {...(close ? { onClick: close } : {})}
      >
        <Icon className="size-5" name={item.icon} />
        <span className={collapsed ? 'sr-only' : ''}>{item.label}</span>
      </Link>
    )
  }

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
        className={`flex-1 overflow-y-auto ${itemCards ? 'space-y-1.5' : 'space-y-1'} ${
          collapsed ? 'p-2' : 'p-3'
        }`}
        aria-label="后台主导航"
      >
        <p
          className={`px-3 pb-2 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${
            collapsed ? 'sr-only' : ''
          }`}
        >
          管理菜单
        </p>
        {navigation.map(renderNavigationItem)}
      </nav>
      <div className={`border-t ${collapsed ? 'p-2' : 'p-3'}`}>
        <div
          className={`flex items-center rounded-xl bg-muted/70 ${collapsed ? 'flex-col justify-center gap-1 p-2' : 'gap-3 p-3'}`}
          title={collapsed ? displayName : undefined}
        >
          <div className="grid size-9 place-items-center rounded-full bg-card text-primary-hover shadow-sm">
            <Icon className="size-5" name="user" />
          </div>
          <div className={collapsed ? 'sr-only' : 'min-w-0 flex-1'}>
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <LogoutButton className="shrink-0" />
        </div>
      </div>
    </div>
  )
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const currentUser = useCurrentUser()
  const displayName = currentUser.data?.displayName || '内容管理员'
  const roleLabel = currentUser.data?.roles.join(' · ') || 'Administrator'
  const avatarLabel = displayName.slice(0, 1) || '管'
  const [mobileOpen, setMobileOpen] = useState(false)
  const layoutMode = useSyncExternalStore(subscribeToLayoutChange, getLayoutSnapshot, () => 'inset')
  const sidebarCollapsed = useSyncExternalStore(
    subscribeToSidebarChange,
    getSidebarSnapshot,
    () => false,
  )
  const inset = layoutMode === 'inset'
  const isDashboard = pathname === '/dashboard'
  const activeNavigationItem = navigation.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  )
  const secondaryBreadcrumbItem = isDashboard ? undefined : activeNavigationItem
  const [breadcrumbTransition, setBreadcrumbTransition] = useState<BreadcrumbTransition>(() => ({
    item: secondaryBreadcrumbItem,
    phase: 'idle',
  }))

  useEffect(() => {
    if (secondaryBreadcrumbItem?.href === breadcrumbTransition.item?.href) return

    let exitTimer: number | undefined
    const startTimer = window.setTimeout(() => {
      if (!breadcrumbTransition.item) {
        setBreadcrumbTransition({ item: secondaryBreadcrumbItem, phase: 'entering' })
        return
      }

      setBreadcrumbTransition((current) => ({ ...current, phase: 'exiting' }))
      exitTimer = window.setTimeout(() => {
        setBreadcrumbTransition({
          item: secondaryBreadcrumbItem,
          phase: secondaryBreadcrumbItem ? 'entering' : 'idle',
        })
      }, 180)
    }, 0)

    return () => {
      window.clearTimeout(startTimer)
      if (exitTimer !== undefined) window.clearTimeout(exitTimer)
    }
  }, [secondaryBreadcrumbItem, breadcrumbTransition.item])

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
        <SidebarContent
          collapsed={sidebarCollapsed}
          itemCards={inset}
          onToggleCollapse={toggleSidebar}
        />
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
          <nav aria-label="面包屑" className="min-w-0 flex-1">
            <svg aria-hidden="true" className="absolute size-0" focusable="false">
              <defs>
                <clipPath id="breadcrumb-first-shape" clipPathUnits="objectBoundingBox">
                  <path d="M .031 0 L .844 0 Q .865 0 .88 .05 L .992 .45 Q 1 .5 .992 .55 L .88 .95 Q .865 1 .844 1 L .031 1 Q 0 1 0 .9 L 0 .1 Q 0 0 .031 0 Z" />
                </clipPath>
                <clipPath id="breadcrumb-connected-shape" clipPathUnits="objectBoundingBox">
                  <path d="M .028 0 L .861 0 Q .88 0 .892 .05 L .993 .45 Q 1 .5 .993 .55 L .892 .95 Q .88 1 .861 1 L .028 1 Q .006 1 .012 .95 L .09 .55 Q .1 .5 .09 .45 L .012 .05 Q .006 0 .028 0 Z" />
                </clipPath>
              </defs>
            </svg>
            <ol className="inline-flex max-w-full items-center py-1 text-sm">
              <li className="relative z-10 shrink-0">
                {isDashboard ? (
                  <span
                    aria-current="page"
                    className="inline-flex h-10 min-w-32 items-center gap-2 bg-gradient-to-r from-primary to-primary-hover pl-3 pr-8 font-semibold text-primary-foreground"
                    style={{
                      clipPath: 'url(#breadcrumb-first-shape)',
                      filter: breadcrumbShadow,
                    }}
                  >
                    <span className="grid size-6 place-items-center rounded-full bg-background/25 shadow-sm">
                      <Icon className="size-3.5" name="dashboard" />
                    </span>
                    工作台
                  </span>
                ) : (
                  <Link
                    className="inline-flex h-10 min-w-32 items-center gap-2 bg-gradient-to-r from-card to-muted pl-3 pr-8 font-medium text-muted-foreground transition-colors hover:from-primary-soft hover:to-primary-soft hover:text-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    href="/dashboard"
                    style={{
                      clipPath: 'url(#breadcrumb-first-shape)',
                      filter: breadcrumbShadow,
                    }}
                  >
                    <span className="grid size-6 place-items-center rounded-full bg-card shadow-sm">
                      <Icon className="size-3.5" name="dashboard" />
                    </span>
                    工作台
                  </Link>
                )}
              </li>
              {breadcrumbTransition.item ? (
                <li
                  className={`relative z-20 -ml-3.5 min-w-0 ${
                    breadcrumbTransition.phase === 'entering'
                      ? 'breadcrumb-slide-in'
                      : breadcrumbTransition.phase === 'exiting'
                        ? 'breadcrumb-slide-out'
                        : ''
                  }`}
                  key={breadcrumbTransition.item.href}
                >
                  <span
                    aria-current="page"
                    className="inline-flex h-10 min-w-36 max-w-64 items-center gap-2 truncate bg-gradient-to-r from-primary to-primary-hover py-0 pl-8 pr-8 font-semibold text-primary-foreground"
                    style={{
                      clipPath: 'url(#breadcrumb-connected-shape)',
                      filter: breadcrumbShadow,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 rounded-full bg-primary-foreground/70"
                    />
                    {breadcrumbTransition.item.label}
                  </span>
                </li>
              ) : null}
            </ol>
          </nav>
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
            <LogoutButton />
            <div className="hidden h-8 w-px bg-border sm:block" />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{displayName}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <div className="grid size-9 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground">
              {avatarLabel}
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
