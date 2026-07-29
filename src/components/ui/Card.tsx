export interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl border border-[var(--border)] bg-[var(--surface)]',
        'shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]',
        'dark:shadow-[0_4px_24px_rgba(0,0,0,0.24),0_1px_2px_rgba(0,0,0,0.24)]',
        'transition-shadow hover:shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]',
        'dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.32),0_2px_4px_rgba(0,0,0,0.24)]',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
