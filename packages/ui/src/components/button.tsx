import type { ComponentProps } from 'react'

import { cn } from '../lib/utils'

const variants = {
  default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover',
  destructive: 'bg-destructive text-white shadow-sm hover:bg-destructive/90',
  ghost: 'hover:bg-muted hover:text-foreground',
  outline:
    'border border-border bg-background shadow-sm hover:border-primary/35 hover:bg-primary-soft',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
} as const

const sizes = {
  default: 'h-10 px-4 py-2',
  icon: 'size-10',
  sm: 'h-9 rounded-md px-3',
} as const

export type ButtonProps = ComponentProps<'button'> & {
  size?: keyof typeof sizes
  variant?: keyof typeof variants
}

export function Button({
  className,
  size = 'default',
  type = 'button',
  variant = 'default',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      type={type}
      {...props}
    />
  )
}
