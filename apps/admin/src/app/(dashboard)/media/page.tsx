'use client'

import { Button } from '@blog/ui/components/button'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'

import {
  deleteAdminMedia,
  getAdminMediaDownloadUrl,
  listAdminMedia,
  type AdminMedia,
  MediaApiError,
} from '../../../features/media/media-api'

export default function MediaPage() {
  const [items, setItems] = useState<AdminMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [busyId, setBusyId] = useState<string>()

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(undefined)
    try {
      const result = await listAdminMedia(signal)
      setItems(result.items)
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setError(mediaErrorMessage(cause))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void Promise.resolve().then(() => load(controller.signal))
    return () => controller.abort()
  }, [load])

  async function openMedia(item: AdminMedia) {
    setBusyId(item.id)
    try {
      const url = isWebUrl(item.url) ? item.url : await getAdminMediaDownloadUrl(item.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (cause) {
      setError(mediaErrorMessage(cause))
    } finally {
      setBusyId(undefined)
    }
  }

  async function removeMedia(item: AdminMedia) {
    if (!window.confirm(`确定删除“${item.originalName}”吗？`)) return
    setBusyId(item.id)
    try {
      await deleteAdminMedia(item.id)
      setItems((current) => current.filter((media) => media.id !== item.id))
    } catch (cause) {
      setError(mediaErrorMessage(cause))
    } finally {
      setBusyId(undefined)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">媒体资源</h1>
          <p className="mt-1 text-sm text-muted-foreground">已登记的对象存储文件。</p>
        </div>
        <Button onClick={() => void load()} type="button" variant="outline">
          刷新
        </Button>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <span>{error}</span>
          <Button onClick={() => void load()} size="sm" type="button" variant="outline">
            重试
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border bg-card">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">加载中...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">暂无媒体资源</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li className="flex items-center gap-4 p-4" key={item.id}>
                <MediaPreview item={item} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.originalName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.mimeType} · {formatBytes(item.size)} · {new Date(item.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button disabled={busyId === item.id} onClick={() => void openMedia(item)} size="sm" type="button" variant="outline">
                    查看
                  </Button>
                  <Button disabled={busyId === item.id} onClick={() => void removeMedia(item)} size="sm" type="button" variant="destructive">
                    删除
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function MediaPreview({ item }: { item: AdminMedia }) {
  if (item.mediaType !== 'IMAGE' || !isWebUrl(item.url)) {
    return <div className="grid size-14 shrink-0 place-items-center rounded-md bg-muted text-xs text-muted-foreground">文件</div>
  }
  return <Image alt="" className="size-14 shrink-0 rounded-md object-cover" height={56} src={item.url} unoptimized width={56} />
}

function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function formatBytes(value: string): string {
  const bytes = Number(value)
  if (!Number.isFinite(bytes) || bytes < 1024) return `${value} bytes`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function mediaErrorMessage(error: unknown): string {
  if (error instanceof MediaApiError) {
    if (error.status === 401 || error.status === 403) return '没有媒体资源操作权限，请重新登录或联系管理员。'
    if (error.code === 'NETWORK_ERROR') return '媒体资源请求失败，请检查 API 服务是否正常。'
    return `媒体资源操作失败：${error.code}`
  }
  return '媒体资源操作失败，请稍后重试。'
}
