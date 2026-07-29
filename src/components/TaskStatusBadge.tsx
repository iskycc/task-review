const TASK_STATUS_TEXT: Record<string, { label: string; className: string }> = {
  PENDING: { label: '待处理', className: 'bg-gray-200 text-gray-800' },
  PASSED: { label: '已通过', className: 'bg-green-100 text-green-800' },
  DEFERRED: { label: '暂时遗留', className: 'bg-amber-100 text-amber-800' },
}

export function TaskStatusBadge({ status }: { status: string }) {
  const info = TASK_STATUS_TEXT[status] ?? { label: status, className: 'bg-gray-200 text-gray-800' }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${info.className}`}>
      {info.label}
    </span>
  )
}
