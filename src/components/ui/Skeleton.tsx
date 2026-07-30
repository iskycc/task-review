export interface SkeletonProps {
  className?: string
}

/** Shimmer placeholder block for loading states. Respects prefers-reduced-motion. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        'animate-pulse rounded-[var(--radius-sm)] bg-[var(--fill)] motion-reduce:animate-none',
        className,
      ].join(' ')}
    />
  )
}
