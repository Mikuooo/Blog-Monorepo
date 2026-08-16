'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@blog/ui/components/badge'
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
  AccessControlApiError,
  createRole,
  deleteRole,
  type AdminRole,
  type AdminUser,
  type RoleListQuery,
  updateRole,
  updateUserRoles,
  updateUserStatus,
  type UserListQuery,
  type UserStatus,
} from './access-control-api'
import {
  accessControlKeys,
  useAdminPermissions,
  useAdminRoles,
  useAdminUsers,
} from './access-control-query'
import {
  roleDefaults,
  roleFormSchema,
  toCreateRole,
  toUpdateRole,
  type RoleFormValues,
} from './access-control-schema'

type ViewMode = 'roles' | 'users'
type EditorState = { kind: 'role'; role?: AdminRole } | { kind: 'user'; user: AdminUser } | null

export type UserPermissionPageParams = {
  keyword?: string
  page?: string
  status?: string
  view?: string
}

export function UserPermissionManagement({ params }: { params: UserPermissionPageParams }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const currentUser = useCurrentUser()
  const view: ViewMode = params.view === 'roles' ? 'roles' : 'users'
  const page = parsePage(params.page)
  const keyword = params.keyword?.trim() || undefined
  const status = isUserStatus(params.status) ? params.status : undefined
  const permissions = currentUser.data?.permissions ?? []
  const canReadUsers = permissions.includes('user.read')
  const canUpdateUsers = permissions.includes('user.update')
  const canDisableUsers = permissions.includes('user.disable')
  const canReadRoles = permissions.includes('role.read')
  const canCreateRoles = permissions.includes('role.create')
  const canUpdateRoles = permissions.includes('role.update')
  const canDeleteRoles = permissions.includes('role.delete')
  const userQuery: UserListQuery = {
    page,
    pageSize: 20,
    ...(keyword ? { keyword } : {}),
    ...(status ? { status } : {}),
  }
  const roleQuery: RoleListQuery = {
    page: view === 'roles' ? page : 1,
    pageSize: view === 'roles' ? 20 : 100,
    ...(view === 'roles' && keyword ? { keyword } : {}),
  }
  const users = useAdminUsers(userQuery, currentUser.isSuccess && canReadUsers && view === 'users')
  const roles = useAdminRoles(roleQuery, currentUser.isSuccess && canReadRoles)
  const availablePermissions = useAdminPermissions(
    currentUser.isSuccess && canReadRoles && view === 'roles',
  )
  const [editor, setEditor] = useState<EditorState>(null)
  const statusMutation = useMutation({
    mutationFn: ({ status: nextStatus, userId }: { status: UserStatus; userId: string }) =>
      updateUserStatus(userId, nextStatus),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: accessControlKeys.all }),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accessControlKeys.all })
      setEditor(null)
    },
  })

  function goToPage(nextPage: number) {
    const search = new URLSearchParams({ view })
    if (keyword) search.set('keyword', keyword)
    if (view === 'users' && status) search.set('status', status)
    if (nextPage > 1) search.set('page', String(nextPage))
    router.push(`/users?${search.toString()}`)
  }

  function toggleUserStatus(user: AdminUser) {
    const nextStatus: UserStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    const message =
      nextStatus === 'DISABLED'
        ? `停用“${user.displayName}”后，其现有会话将立即失效。确定继续吗？`
        : `确定重新启用“${user.displayName}”吗？`
    if (window.confirm(message)) statusMutation.mutate({ status: nextStatus, userId: user.id })
  }

  function removeRole(role: AdminRole) {
    if (!window.confirm(`确定永久删除角色“${role.name}”吗？`)) return
    deleteMutation.mutate(role.id)
  }

  const mutationError = statusMutation.error ?? deleteMutation.error

  return (
    <>
      <PageHeader
        actions={
          view === 'roles' && canCreateRoles ? (
            <Button onClick={() => setEditor({ kind: 'role' })}>
              <Icon className="size-4" name="plus" />
              新建角色
            </Button>
          ) : null
        }
        description="管理后台用户状态、角色分配和权限集合。"
        eyebrow="Security"
        title="用户权限"
      />

      <div className="mb-5 flex gap-2 border-b">
        <ViewTab active={view === 'users'} href="/users?view=users" label="用户" />
        <ViewTab active={view === 'roles'} href="/users?view=roles" label="角色与权限" />
      </div>

      {editor?.kind === 'user' ? (
        <UserRoleEditor
          key={editor.user.id}
          onClose={() => setEditor(null)}
          roles={roles.data?.items ?? []}
          user={editor.user}
        />
      ) : editor?.kind === 'role' ? (
        <RoleEditor
          key={editor.role?.id ?? 'new-role'}
          onClose={() => setEditor(null)}
          permissions={availablePermissions.data ?? []}
          {...(editor.role ? { role: editor.role } : {})}
        />
      ) : null}

      {mutationError ? <ErrorNotice error={mutationError} /> : null}

      {view === 'users' ? (
        <UserPanel
          canDisable={canDisableUsers}
          canEditRoles={canUpdateUsers && canReadRoles}
          canRead={canReadUsers}
          currentUserId={currentUser.data?.id}
          keyword={keyword}
          onEdit={(user) => setEditor({ kind: 'user', user })}
          onPage={goToPage}
          onToggleStatus={toggleUserStatus}
          page={page}
          status={status}
          users={users}
        />
      ) : (
        <RolePanel
          canDelete={canDeleteRoles}
          canRead={canReadRoles}
          canUpdate={canUpdateRoles}
          keyword={keyword}
          onDelete={removeRole}
          onEdit={(role) => setEditor({ kind: 'role', role })}
          onPage={goToPage}
          page={page}
          roles={roles}
        />
      )}
    </>
  )
}

function UserPanel({
  canDisable,
  canEditRoles,
  canRead,
  currentUserId,
  keyword,
  onEdit,
  onPage,
  onToggleStatus,
  page,
  status,
  users,
}: {
  canDisable: boolean
  canEditRoles: boolean
  canRead: boolean
  currentUserId?: string | undefined
  keyword?: string | undefined
  onEdit: (user: AdminUser) => void
  onPage: (page: number) => void
  onToggleStatus: (user: AdminUser) => void
  page: number
  status?: UserStatus | undefined
  users: ReturnType<typeof useAdminUsers>
}) {
  if (!canRead) {
    return <NoPermission message="当前账号没有查看用户列表的权限。" />
  }

  return (
    <Card>
      <ListFilters keyword={keyword} status={status} view="users" />
      <div className="overflow-x-auto border-t">
        <Table className="min-w-[940px]">
          <TableHeader>
            <TableRow>
              <TableHead>用户</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>最近登录</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="w-48">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.isPending ? (
              <StateRow columns={6} message="正在加载用户…" />
            ) : users.isError ? (
              <StateRow
                action={
                  <Button onClick={() => void users.refetch()} size="sm" variant="outline">
                    重新加载
                  </Button>
                }
                columns={6}
                message={accessControlErrorMessage(users.error)}
              />
            ) : users.data.items.length ? (
              users.data.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <p className="font-semibold">{user.displayName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      @{user.username} · {user.email}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'ACTIVE' ? 'success' : 'secondary'}>
                      {user.status === 'ACTIVE' ? '正常' : '已停用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {user.roles.length
                        ? user.roles.map((role) => (
                            <Badge key={role.id} variant="outline">
                              {role.name}
                            </Badge>
                          ))
                        : '未分配'}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : '从未登录'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {canEditRoles ? (
                        <Button onClick={() => onEdit(user)} size="sm" variant="outline">
                          分配角色
                        </Button>
                      ) : null}
                      {canDisable ? (
                        <Button
                          disabled={user.id === currentUserId}
                          onClick={() => onToggleStatus(user)}
                          size="sm"
                          title={user.id === currentUserId ? '不能停用当前账号' : undefined}
                          variant="ghost"
                        >
                          {user.status === 'ACTIVE' ? '停用' : '启用'}
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <StateRow columns={6} message="没有匹配的用户。" />
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination onPage={onPage} page={page} pending={users.isPending} result={users.data} />
    </Card>
  )
}

function RolePanel({
  canDelete,
  canRead,
  canUpdate,
  keyword,
  onDelete,
  onEdit,
  onPage,
  page,
  roles,
}: {
  canDelete: boolean
  canRead: boolean
  canUpdate: boolean
  keyword?: string | undefined
  onDelete: (role: AdminRole) => void
  onEdit: (role: AdminRole) => void
  onPage: (page: number) => void
  page: number
  roles: ReturnType<typeof useAdminRoles>
}) {
  if (!canRead) return <NoPermission message="当前账号没有查看角色的权限。" />
  return (
    <Card>
      <ListFilters keyword={keyword} view="roles" />
      <div className="overflow-x-auto border-t">
        <Table className="min-w-[820px]">
          <TableHeader>
            <TableRow>
              <TableHead>角色</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>权限</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead className="w-44">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.isPending ? (
              <StateRow columns={6} message="正在加载角色…" />
            ) : roles.isError ? (
              <StateRow columns={6} message={accessControlErrorMessage(roles.error)} />
            ) : roles.data.items.length ? (
              roles.data.items.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <p className="font-semibold">{role.name}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{role.code}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.isSystem ? 'warning' : 'secondary'}>
                      {role.isSystem ? '系统角色' : '自定义'}
                    </Badge>
                  </TableCell>
                  <TableCell>{role.permissions.length}</TableCell>
                  <TableCell>{role.userCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(role.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {canUpdate ? (
                        <Button onClick={() => onEdit(role)} size="sm" variant="outline">
                          编辑
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          disabled={role.isSystem || role.userCount > 0}
                          onClick={() => onDelete(role)}
                          size="sm"
                          title={
                            role.isSystem
                              ? '系统角色不能删除'
                              : role.userCount
                                ? '请先移除关联用户'
                                : undefined
                          }
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
              <StateRow columns={6} message="没有匹配的角色。" />
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination onPage={onPage} page={page} pending={roles.isPending} result={roles.data} />
    </Card>
  )
}

function UserRoleEditor({
  onClose,
  roles,
  user,
}: {
  onClose: () => void
  roles: AdminRole[]
  user: AdminUser
}) {
  const queryClient = useQueryClient()
  const form = useForm<{ roleIds: string[] }>({
    defaultValues: { roleIds: user.roles.map(({ id }) => id) },
  })
  const mutation = useMutation({
    mutationFn: ({ roleIds }: { roleIds: string[] }) => updateUserRoles(user.id, roleIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accessControlKeys.all })
      onClose()
    },
  })
  return (
    <Card className="mb-5 border-primary/25">
      <CardHeader>
        <CardTitle>为 {user.displayName} 分配角色</CardTitle>
        <CardDescription>保存后，新的权限将在用户下一次请求时生效。</CardDescription>
      </CardHeader>
      <CardContent>
        {mutation.isError ? <ErrorNotice error={mutation.error} /> : null}
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <label
                className="flex items-start gap-3 rounded-lg border p-3 text-sm hover:bg-muted/50"
                key={role.id}
              >
                <input
                  className="mt-0.5 size-4"
                  type="checkbox"
                  value={role.id}
                  {...form.register('roleIds')}
                />
                <span>
                  <span className="block font-semibold">{role.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{role.code}</span>
                </span>
              </label>
            ))}
          </div>
          <EditorActions
            dirty={form.formState.isDirty}
            onClose={onClose}
            pending={mutation.isPending}
          />
        </form>
      </CardContent>
    </Card>
  )
}

function RoleEditor({
  onClose,
  permissions,
  role,
}: {
  onClose: () => void
  permissions: Array<{ code: string; description: string | null; id: string }>
  role?: AdminRole
}) {
  const queryClient = useQueryClient()
  const form = useForm<RoleFormValues>({
    defaultValues: roleDefaults(role),
    resolver: zodResolver(roleFormSchema),
  })
  const mutation = useMutation({
    mutationFn: (values: RoleFormValues) =>
      role
        ? updateRole(role.id, toUpdateRole(values, role.isSystem))
        : createRole(toCreateRole(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accessControlKeys.all })
      onClose()
    },
  })
  return (
    <Card className="mb-5 border-primary/25">
      <CardHeader>
        <CardTitle>{role ? '编辑角色' : '新建角色'}</CardTitle>
        <CardDescription>
          {role?.isSystem
            ? '系统角色允许修改名称和描述，但权限集合受保护。'
            : '权限按最小授权原则选择。'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mutation.isError ? <ErrorNotice error={mutation.error} /> : null}
        <form
          className="space-y-5"
          noValidate
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field error={form.formState.errors.name?.message} id="role-name" label="角色名称">
              <Input id="role-name" maxLength={120} {...form.register('name')} />
            </Field>
            <Field error={form.formState.errors.code?.message} id="role-code" label="角色代码">
              <Input
                disabled={Boolean(role)}
                id="role-code"
                maxLength={80}
                placeholder="CONTENT_EDITOR"
                {...form.register('code')}
              />
            </Field>
            <Field
              className="md:col-span-2"
              error={form.formState.errors.description?.message}
              id="role-description"
              label="描述"
            >
              <textarea
                className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                id="role-description"
                maxLength={500}
                {...form.register('description')}
              />
            </Field>
          </div>
          <fieldset disabled={role?.isSystem}>
            <legend className="mb-3 text-sm font-semibold">权限集合</legend>
            <div className="grid max-h-72 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-3">
              {permissions.map((permission) => (
                <label
                  className="flex items-start gap-2 rounded-md p-2 text-sm hover:bg-muted/50"
                  key={permission.id}
                >
                  <input
                    className="mt-0.5 size-4"
                    type="checkbox"
                    value={permission.id}
                    {...form.register('permissionIds')}
                  />
                  <span>
                    <span className="block font-mono text-xs font-semibold">{permission.code}</span>
                    {permission.description ? (
                      <span className="text-xs text-muted-foreground">
                        {permission.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <EditorActions
            dirty={form.formState.isDirty}
            onClose={onClose}
            pending={mutation.isPending}
          />
        </form>
      </CardContent>
    </Card>
  )
}

function ListFilters({
  keyword,
  status,
  view,
}: {
  keyword?: string | undefined
  status?: UserStatus | undefined
  view: ViewMode
}) {
  return (
    <CardContent className="pt-5 sm:pt-6">
      <form className="flex flex-col gap-3 lg:flex-row" method="get">
        <input name="view" type="hidden" value={view} />
        <div className="relative flex-1">
          <label className="sr-only" htmlFor={`${view}-keyword`}>
            搜索
          </label>
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            name="search"
          />
          <Input
            className="pl-9"
            defaultValue={keyword}
            id={`${view}-keyword`}
            maxLength={120}
            name="keyword"
            placeholder={view === 'users' ? '搜索姓名、用户名或邮箱' : '搜索角色名称或代码'}
          />
        </div>
        {view === 'users' ? (
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            defaultValue={status ?? ''}
            name="status"
          >
            <option value="">全部状态</option>
            <option value="ACTIVE">正常</option>
            <option value="DISABLED">已停用</option>
          </select>
        ) : null}
        <Button type="submit">筛选</Button>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-semibold shadow-sm hover:bg-muted"
          href={`/users?view=${view}`}
        >
          重置
        </Link>
      </form>
    </CardContent>
  )
}

function ViewTab({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={`border-b-2 px-4 py-3 text-sm font-semibold ${active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
      href={href}
    >
      {label}
    </Link>
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

function EditorActions({
  dirty,
  onClose,
  pending,
}: {
  dirty: boolean
  onClose: () => void
  pending: boolean
}) {
  return (
    <div className="mt-5 flex gap-3">
      <Button disabled={pending} type="submit">
        {pending ? '正在保存…' : '保存'}
      </Button>
      <Button
        onClick={() => {
          if (!dirty || window.confirm('放弃未保存的修改？')) onClose()
        }}
        type="button"
        variant="outline"
      >
        取消
      </Button>
    </div>
  )
}

function StateRow({
  action,
  columns,
  message,
}: {
  action?: React.ReactNode
  columns: number
  message: string
}) {
  return (
    <TableRow>
      <TableCell className="h-40 text-center" colSpan={columns}>
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">{message}</p>
          {action}
        </div>
      </TableCell>
    </TableRow>
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

function NoPermission({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>没有访问权限</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function ErrorNotice({ error }: { error: unknown }) {
  return (
    <p
      className="mb-4 rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      role="alert"
    >
      {accessControlErrorMessage(error)}
    </p>
  )
}

function accessControlErrorMessage(error: unknown): string {
  if (!(error instanceof AccessControlApiError)) return '用户权限操作失败，请稍后重试。'
  const messages: Record<string, string> = {
    LAST_SUPER_ADMIN: '必须至少保留一个正常状态的超级管理员。',
    NETWORK_ERROR: '无法连接后台 API。',
    PERMISSION_NOT_FOUND: '选择的权限不存在或已被移除。',
    ROLE_CODE_EXISTS: '角色代码已被使用。',
    ROLE_HAS_USERS: '该角色仍有关联用户，请先移除用户。',
    ROLE_SYSTEM_DELETE_FORBIDDEN: '系统角色不能删除。',
    ROLE_SYSTEM_PERMISSIONS_FORBIDDEN: '系统角色的权限集合受保护。',
    USER_SELF_DISABLE: '不能停用当前登录账号。',
  }
  if (error.status === 401) return '登录状态已失效，请重新登录。'
  if (error.status === 403) return '当前账号没有执行此操作的权限。'
  return messages[error.code] ?? '用户权限操作失败，请稍后重试。'
}

function isUserStatus(value: string | undefined): value is UserStatus {
  return value === 'ACTIVE' || value === 'DISABLED'
}

function parsePage(value: string | undefined): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}
