export interface CardProps {
  children: React.ReactNode
  className?: string
  /** When true, the card gets hover shadow + pointer cursor (clickable cards). */
  interactive?: boolean
}

export function Card({ children, className = '', interactive = false }: CardProps) {
  return (
    <div
      className={[
        'rounded-[var(--radius-lg)] border border-[var(--separator)] bg-[var(--surface-primary)]',
        // Subtle surface shadow in light mode; dark mode relies on border + surface level.
        'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)]',
        'dark:shadow-[0_1px_2px_rgba(0,0,0,0.24)]',
        interactive
          ? 'cursor-pointer transition-shadow duration-[var(--duration-base)] ease-[var(--ease-out)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.32)]'
          : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
