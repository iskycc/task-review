import Link from 'next/link'
import { FileText } from 'lucide-react'
import { Button, Card, Progress } from '@/components/ui'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import { type ReactNode } from 'react'

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

  let action: ReactNode = null
  if (data.status === 'READY' || data.status === 'REVIEWING') {
    const label = data.status === 'READY' ? '开始审核' : '继续审核'
    action = (
      <Button asChild size="sm">
        <Link href={`/projects/${data.id}/review/${data.lastSequence ?? 1}`}>{label}</Link>
      </Button>
    )
  } else if (data.status === 'COMPLETED') {
    action = (
      <Button asChild variant="secondary" size="sm">
        <Link href={`/projects/${data.id}/result`}>查看结果</Link>
      </Button>
    )
  }

  return (
    <Card className="p-6 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] shadow-sm">
            <FileText className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight text-[var(--text-primary)]">{data.name}</h2>
            <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
              {data.originalFileName} · {data.createdAt.toLocaleString('zh-CN')}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <ProjectStatusBadge status={data.status} />
          {action}
        </div>
      </div>

      {data.status === 'FAILED' && (
        <div className="mt-6 rounded-2xl bg-[var(--danger)]/8 px-4 py-3 text-sm leading-relaxed text-[var(--danger)]">
          导入失败：{data.parseError ?? '未知原因'}
        </div>
      )}

      {data.status === 'PARSING' && (
        <div className="mt-6 rounded-2xl bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          正在解析 PDF 并创建任务…
        </div>
      )}

      {data.totalTasks > 0 && data.status !== 'FAILED' && (
        <div className="mt-6 space-y-3 border-t border-[var(--border)] pt-5">
          <div className="flex items-center justify-between gap-4 text-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[var(--text-secondary)]">
              <span className="tabular-nums">共 {data.totalTasks} 条</span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" />
                通过 {data.passedTasks}
              </span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--warning)]" aria-hidden="true" />
                暂留 {data.deferredTasks}
              </span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-secondary)]/50" aria-hidden="true" />
                待处理 {data.pendingTasks}
              </span>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--text-primary)]">{percent}%</span>
          </div>
          <Progress value={processed} max={data.totalTasks} label={`审核进度 ${percent}%`} />
        </div>
      )}
    </Card>
  )
}
