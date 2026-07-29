const STATUS_TEXT: Record<string, { label: string; className: string }> = {
  PARSING: { label: '解析中', className: 'bg-blue-100 text-blue-800' },
  FAILED: { label: '导入失败', className: 'bg-red-100 text-red-800' },
  READY: { label: '待审核', className: 'bg-gray-200 text-gray-800' },
  REVIEWING: { label: '审核中', className: 'bg-amber-100 text-amber-800' },
  COMPLETED: { label: '已完成', className: 'bg-green-100 text-green-800' },
}

export function ProjectStatusBadge({ status }: { status: string }) {
  const info = STATUS_TEXT[status] ?? { label: status, className: 'bg-gray-200 text-gray-800' }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${info.className}`}>
      {info.label}
    </span>
  )
}
