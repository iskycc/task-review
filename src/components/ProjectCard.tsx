import Link from 'next/link'
import { FileText } from 'lucide-react'
import { Button, Card, Progress } from '@/components/ui'
import { ProjectStatusBadge } from './ProjectStatusBadge'

export interface ProjectCardData {
  id: string
  name: string
  originalFileName: string
  status: string
  parseError: string | null
  totalTasks: number
  passedTasks: number
  deferredTasks: number
  pendingTasks: number
  createdAt: Date
  lastSequence: number | null
}

export function ProjectCard({ data }: { data: ProjectCardData }) {
  const processed = data.passedTasks + data.deferredTasks
  const percent = data.totalTasks > 0 ? Math.round((processed / data.totalTasks) * 100) : 0

  let action: React.ReactNode = null
  if (data.status === 'READY' || data.status === 'REVIEWING') {
    const label = data.status === 'READY' ? '开始审核' : '继续审核'
    action = (
      <Link href={`/projects/${data.id}/review/${data.lastSequence ?? 1}`}>
        <Button size="sm">{label}</Button>
      </Link>
    )
  } else if (data.status === 'COMPLETED') {
    action = (
      <Link href={`/projects/${data.id}/result`}>
        <Button variant="secondary" size="sm">查看结果</Button>
      </Link>
    )
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
            <FileText className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">{data.name}</h2>
            <p className="truncate text-sm text-[var(--text-secondary)]">
              {data.originalFileName} · {data.createdAt.toLocaleString('zh-CN')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ProjectStatusBadge status={data.status} />
          {action}
        </div>
      </div>

      {data.status === 'FAILED' && (
        <p className="mt-4 text-sm text-[var(--danger)]">导入失败：{data.parseError ?? '未知原因'}</p>
      )}

      {data.status === 'PARSING' && (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">正在解析 PDF 并创建任务…</p>
      )}

      {data.totalTasks > 0 && data.status !== 'FAILED' && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>
              共 {data.totalTasks} 条 · 已通过 {data.passedTasks} · 暂留 {data.deferredTasks} · 待处理 {data.pendingTasks}
            </span>
            <span>{percent}%</span>
          </div>
          <Progress value={processed} max={data.totalTasks} label={`审核进度 ${percent}%`} />
        </div>
      )}
    </Card>
  )
}
