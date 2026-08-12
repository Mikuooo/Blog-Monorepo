import type { ComponentProps } from 'react'

export type ButtonProps = ComponentProps<'button'>

export function Button({ className = '', type = 'button', ...props }: ButtonProps) {
  const classes = [
    'inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2',
    'text-sm font-medium text-white transition hover:bg-slate-800',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500',
    'disabled:pointer-events-none disabled:opacity-50',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <button className={classes} type={type} {...props} />
}
