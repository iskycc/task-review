import { type ReactNode } from 'react'

export interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/** Reusable empty state with icon, title, description, and optional action. */
export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--separator)] bg-[var(--surface-primary)] px-6 py-16 text-center',
        className,
      ].join(' ')}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-full)] bg-[var(--fill)] text-[var(--label-tertiary)]">
        {icon}
      </div>
      <h3 className="text-card-title text-[var(--label-primary)]">{title}</h3>
      {description && <p className="max-w-sm text-sm leading-[1.6] text-[var(--label-secondary)]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
