'use client'

import * as PopoverPrimitive from '@radix-ui/react-popover'
import type { ComponentProps } from 'react'

import { cn } from '../lib/utils'

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

export function PopoverContent({
  className,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align="start"
        className={cn(
          'z-50 w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl outline-none',
          className,
        )}
        sideOffset={8}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
