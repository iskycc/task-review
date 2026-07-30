import { type ReactNode } from 'react'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

export interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-[var(--label-tertiary)]/12 text-[var(--label-secondary)]',
  success: 'bg-[var(--success)]/12 text-[var(--success)]',
  warning: 'bg-[var(--warning)]/12 text-[var(--warning)]',
  danger: 'bg-[var(--danger)]/12 text-[var(--danger)]',
  info: 'bg-[var(--tint)]/12 text-[var(--tint)]',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex h-6 items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 text-xs font-medium',
        variants[variant],
        className,
      ].join(' ')}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {children}
    </span>
  )
}
