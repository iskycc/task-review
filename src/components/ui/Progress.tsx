export interface ProgressProps {
  value: number
  max?: number
  label: string
}

export function Progress({ value, max = 100, label }: ProgressProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div
      className="w-full"
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--fill)]">
        <div
          className="h-full rounded-full bg-[var(--tint)] transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
