'use client'

import { Badge } from '@blog/ui/components/badge'
import { Button } from '@blog/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@blog/ui/components/dialog'
import { Input } from '@blog/ui/components/input'
import { Popover, PopoverContent, PopoverTrigger } from '@blog/ui/components/popover'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { useCurrentUser } from '@/features/auth/auth-query'
import { createCategory, type Category } from '@/features/categories/category-api'
import { categoryKeys, useCategoryList } from '@/features/categories/category-query'
import { createTag } from '@/features/tags/tag-api'
import { tagKeys, useTagList } from '@/features/tags/tag-query'

export function CategoryCascadeField({
  onChange,
  value,
}: {
  onChange: (categoryId: string) => void
  value: string
}) {
  const currentUser = useCurrentUser()
  const queryClient = useQueryClient()
  const categories = useCategoryList({ page: 1, pageSize: 100 })
  const [open, setOpen] = useState(false)
  const [createParent, setCreateParent] = useState<Category | null | undefined>(undefined)
  const [name, setName] = useState('')
  const items = useMemo(() => categories.data?.items ?? [], [categories.data?.items])
  const selected = items.find((item) => item.id === value)
  const canCreate = currentUser.data?.permissions.includes('category.create') ?? false
  const createMutation = useMutation({
    mutationFn: () =>
      createCategory({ name: name.trim(), ...(createParent ? { parentId: createParent.id } : {}) }),
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      onChange(category.id)
      setName('')
      setCreateParent(undefined)
      setOpen(false)
    },
  })
  const children = useMemo(() => groupCategories(items), [items])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button className="w-full justify-between" variant="outline">
          <span className={selected ? '' : 'text-muted-foreground'}>
            {selected ? categoryPath(selected, items) : '选择分类'}
          </span>
          <span aria-hidden="true">⌄</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">文章分类</p>
          {canCreate ? (
            <Button onClick={() => setCreateParent(null)} size="sm" variant="ghost">
              + 根分类
            </Button>
          ) : null}
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {categories.isLoading ? (
            <p className="p-3 text-sm text-muted-foreground">加载中…</p>
          ) : null}
          {renderCategoryLevel(
            children,
            null,
            0,
            value,
            (category) => {
              onChange(category.id)
              setOpen(false)
            },
            canCreate ? setCreateParent : undefined,
          )}
        </div>
        {createParent !== undefined ? (
          <form
            className="space-y-3 border-t border-border pt-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (name.trim()) createMutation.mutate()
            }}
          >
            <p className="text-xs text-muted-foreground">
              {createParent ? `在“${createParent.name}”下新增分类` : '新增根分类'}
            </p>
            <Input
              autoFocus
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              placeholder="只需输入分类名称"
              value={name}
            />
            {createMutation.isError ? (
              <p className="text-xs text-destructive">分类创建失败，请检查名称后重试。</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button onClick={() => setCreateParent(undefined)} size="sm" variant="ghost">
                返回
              </Button>
              <Button disabled={!name.trim() || createMutation.isPending} size="sm" type="submit">
                {createMutation.isPending ? '创建中…' : '创建并选择'}
              </Button>
            </div>
          </form>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

export function TagPickerField({
  onChange,
  value,
}: {
  onChange: (tagIds: string[]) => void
  value: string[]
}) {
  const currentUser = useCurrentUser()
  const queryClient = useQueryClient()
  const tags = useTagList({ page: 1, pageSize: 100 })
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [newName, setNewName] = useState('')
  const items = tags.data?.items ?? []
  const selected = items.filter((tag) => value.includes(tag.id))
  const filtered = items.filter((tag) => tag.name.toLowerCase().includes(keyword.toLowerCase()))
  const canCreate = currentUser.data?.permissions.includes('tag.create') ?? false
  const createMutation = useMutation({
    mutationFn: () => createTag({ name: newName.trim() }),
    onSuccess: async (tag) => {
      await queryClient.invalidateQueries({ queryKey: tagKeys.all })
      onChange([...new Set([...value, tag.id])])
      setNewName('')
    },
  })

  return (
    <>
      <button
        className="flex min-h-11 w-full flex-wrap items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left shadow-sm hover:border-primary-border"
        onClick={() => setOpen(true)}
        type="button"
      >
        {selected.length ? (
          selected.map((tag) => (
            <Badge key={tag.id} variant="secondary">
              {tag.name}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">+ 添加标签</span>
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>选择标签</DialogTitle>
            <DialogDescription>点击标签切换选择，也可以只输入名称快速创建。</DialogDescription>
          </DialogHeader>
          <Input
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索标签"
            value={keyword}
          />
          <div className="mt-4 flex max-h-64 flex-wrap gap-2 overflow-y-auto">
            {filtered.map((tag) => {
              const active = value.includes(tag.id)
              return (
                <Button
                  key={tag.id}
                  onClick={() =>
                    onChange(active ? value.filter((id) => id !== tag.id) : [...value, tag.id])
                  }
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                >
                  {tag.name}
                </Button>
              )
            })}
          </div>
          {canCreate ? (
            <form
              className="mt-5 flex gap-2 border-t border-border pt-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (newName.trim()) createMutation.mutate()
              }}
            >
              <Input
                maxLength={120}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="新标签名称"
                value={newName}
              />
              <Button disabled={!newName.trim() || createMutation.isPending} type="submit">
                新建
              </Button>
            </form>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>完成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function groupCategories(items: Category[]): Map<string | null, Category[]> {
  const grouped = new Map<string | null, Category[]>()
  for (const item of items) {
    const parentId = item.parent?.id ?? null
    grouped.set(parentId, [...(grouped.get(parentId) ?? []), item])
  }
  return grouped
}

function renderCategoryLevel(
  grouped: Map<string | null, Category[]>,
  parentId: string | null,
  depth: number,
  selectedId: string,
  select: (category: Category) => void,
  createChild?: (category: Category) => void,
): ReactNode {
  return (grouped.get(parentId) ?? []).map((category) => (
    <div key={category.id}>
      <div
        className={`flex items-center rounded-lg ${selectedId === category.id ? 'bg-primary-soft' : 'hover:bg-muted'}`}
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <button
          className="min-w-0 flex-1 px-3 py-2 text-left text-sm"
          onClick={() => select(category)}
          type="button"
        >
          {category.name}
        </button>
        {createChild ? (
          <button
            className="px-3 py-2 text-xs text-primary-active"
            onClick={() => createChild(category)}
            type="button"
          >
            + 子分类
          </button>
        ) : null}
      </div>
      {renderCategoryLevel(grouped, category.id, depth + 1, selectedId, select, createChild)}
    </div>
  ))
}

function categoryPath(category: Category, items: Category[]): string {
  const names = [category.name]
  let parent = category.parent
  while (parent) {
    names.unshift(parent.name)
    parent = items.find((item) => item.id === parent?.id)?.parent ?? null
  }
  return names.join(' / ')
}
