'use client'

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
import Image from 'next/image'
import { useEffect, useState } from 'react'

export function ArticleCoverField({
  onChange,
  value,
}: {
  onChange: (id: string) => void
  value: string
}) {
  const [open, setOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>()

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl],
  )

  return (
    <>
      <button
        className="grid aspect-video w-full place-items-center overflow-hidden rounded-xl border border-dashed border-primary-border bg-primary-soft/55 text-sm text-muted-foreground hover:bg-primary-soft"
        onClick={() => setOpen(true)}
        type="button"
      >
        {previewUrl ? (
          <span className="relative size-full">
            <Image alt="封面预览" className="object-cover" fill src={previewUrl} unoptimized />
          </span>
        ) : (
          '+ 选择封面'
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(52rem,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>文章封面</DialogTitle>
            <DialogDescription>
              当前仓库尚未实现 Media 上传 API；文件可用于本地比例预览，保存文章仍需填写已有媒体
              UUID。
            </DialogDescription>
          </DialogHeader>
          <Input
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              if (previewUrl) URL.revokeObjectURL(previewUrl)
              setPreviewUrl(URL.createObjectURL(file))
            }}
            type="file"
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ['16:9', 'aspect-video'],
              ['4:3', 'aspect-[4/3]'],
              ['3:2', 'aspect-[3/2]'],
              ['1:1', 'aspect-square'],
            ].map(([label, ratio]) => (
              <figure key={label}>
                <div className={`${ratio} relative overflow-hidden rounded-xl bg-muted`}>
                  {previewUrl ? (
                    <Image alt="" className="object-cover" fill src={previewUrl} unoptimized />
                  ) : null}
                </div>
                <figcaption className="mt-1 text-xs text-muted-foreground">{label}</figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            <label className="text-sm font-semibold" htmlFor="cover-media-id">
              媒体 UUID
            </label>
            <Input
              id="cover-media-id"
              onChange={(event) => onChange(event.target.value)}
              placeholder="已有媒体 UUID"
              value={value}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>完成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
