import { type ComponentType, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastProps {
  kind: ToastKind
  children: ReactNode
  className?: string
}

const kindConfig: Record<ToastKind, { classes: string; Icon: ComponentType<{ className?: string }> }> = {
  success: {
    classes: 'border-l-[var(--success)] bg-[var(--success)]/10 text-[var(--label-primary)]',
    Icon: CheckCircle2,
  },
  error: {
    classes: 'border-l-[var(--danger)] bg-[var(--danger)]/10 text-[var(--label-primary)]',
    Icon: AlertCircle,
  },
  info: {
    classes: 'border-l-[var(--tint)] bg-[var(--tint)]/10 text-[var(--label-primary)]',
    Icon: Info,
  },
}

const kindIconColor: Record<ToastKind, string> = {
  success: 'text-[var(--success)]',
  error: 'text-[var(--danger)]',
  info: 'text-[var(--tint)]',
}

/** Minimal inline notice for success/error/info feedback (not a toast library). */
export function Toast({ kind, children, className = '' }: ToastProps) {
  const { classes, Icon } = kindConfig[kind]
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={[
        'flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--separator)] border-l-2 px-3.5 py-3 text-sm leading-[1.6]',
        classes,
        className,
      ].join(' ')}
    >
      <span aria-hidden="true" className={`mt-0.5 flex shrink-0 ${kindIconColor[kind]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
