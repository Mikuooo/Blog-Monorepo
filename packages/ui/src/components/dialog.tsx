'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ComponentProps } from 'react'

import { cn } from '../lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/35 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl outline-none',
          className,
        )}
        {...props}
      />
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mb-5 space-y-1.5', className)} {...props} />
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-lg font-semibold', className)} {...props} />
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-sm leading-6 text-muted-foreground', className)}
      {...props}
    />
  )
}

export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mt-6 flex justify-end gap-2', className)} {...props} />
}
