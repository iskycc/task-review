import { Badge } from '@/components/ui'
import type { BadgeVariant } from '@/components/ui'

const STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  PARSING: { label: '解析中', variant: 'info' },
  FAILED: { label: '导入失败', variant: 'danger' },
  READY: { label: '待审核', variant: 'default' },
  REVIEWING: { label: '审核中', variant: 'warning' },
  COMPLETED: { label: '已完成', variant: 'success' },
}

export function ProjectStatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={info.variant}>{info.label}</Badge>
}
