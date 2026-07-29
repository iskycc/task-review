import { Badge } from '@/components/ui'
import type { BadgeVariant } from '@/components/ui'

const STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: '待处理', variant: 'default' },
  PASSED: { label: '已通过', variant: 'success' },
  DEFERRED: { label: '暂时遗留', variant: 'warning' },
}

export function TaskStatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={info.variant}>{info.label}</Badge>
}
