export interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={[
        'rounded-3xl border border-[var(--border)] bg-[var(--surface)]',
        'shadow-[0_8px_30px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]',
        'dark:shadow-[0_8px_30px_rgba(0,0,0,0.28),0_1px_3px_rgba(0,0,0,0.28)]',
        'transition-shadow hover:shadow-[0_12px_40px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.04)]',
        'dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.36),0_1px_3px_rgba(0,0,0,0.28)]',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
