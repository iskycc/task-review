import { type ReactNode } from 'react'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

export interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]',
  success: 'bg-[var(--success)]/12 text-[var(--success)]',
  warning: 'bg-[var(--warning)]/12 text-[var(--warning)]',
  danger: 'bg-[var(--danger)]/12 text-[var(--danger)]',
  info: 'bg-[var(--accent)]/12 text-[var(--accent)]',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        variants[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
