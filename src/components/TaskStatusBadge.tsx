import { Badge } from '@/components/ui'
import type { BadgeVariant } from '@/components/ui'

const STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: '待处理', variant: 'default' },
  PASSED: { label: '已通过', variant: 'success' },
  DEFERRED: { label: '暂时遗留', variant: 'warning' },
}

export function TaskStatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status] ?? { label: status, variant: 'default' as const }
  return (
    <Badge variant={info.variant} className="gap-1.5">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {info.label}
    </Badge>
  )
}
