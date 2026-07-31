'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Button, Progress } from '@/components/ui'
import { formatDateTime } from '@/lib/format'
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
  role: string
}

function Stat({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} aria-hidden="true" />
      {label} {value}
    </span>
  )
}

export function ProjectCard({ data }: { data: ProjectCardData }) {
  const router = useRouter()
  const parsing = data.status === 'PARSING'
  const failed = data.status === 'FAILED'
  const processed = data.passedTasks + data.deferredTasks
  const percent = data.totalTasks > 0 ? Math.round((processed / data.totalTasks) * 100) : 0

  async function retryParsing() {
    await fetch(`/api/projects/${data.id}/retry`, { method: 'POST' })
    router.refresh()
  }

  // Poll the server while parsing so the row turns actionable on its own.
  useEffect(() => {
    if (!parsing) return
    const timer = setInterval(() => router.refresh(), 4000)
    return () => clearInterval(timer)
  }, [parsing, router])

  const href =
    parsing || failed
      ? null
      : data.status === 'COMPLETED'
        ? `/projects/${data.id}/result`
        : `/projects/${data.id}/review/${data.lastSequence ?? 1}`

  const actionLabel =
    data.status === 'READY'
      ? '开始审核'
      : data.status === 'REVIEWING'
        ? '继续审核'
        : data.status === 'COMPLETED'
          ? '查看结果'
          : null

  return (
    <div
      className={[
        'relative grid gap-5 px-5 py-6 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] sm:px-7 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-center md:gap-7',
        href ? 'hover:bg-[var(--fill)]/45' : '',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          {href ? (
            <Link
              href={href}
              className="max-w-full truncate rounded-[var(--radius-sm)] text-[20px] font-semibold tracking-[-0.025em] text-[var(--label-primary)] after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[var(--tint)] sm:text-[22px]"
            >
              {data.name}
            </Link>
          ) : (
            <h2 className="truncate text-[20px] font-semibold tracking-[-0.025em] text-[var(--label-primary)] sm:text-[22px]">{data.name}</h2>
          )}
          <span className="relative z-10 shrink-0">
            <ProjectStatusBadge status={data.status} />
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--label-secondary)] sm:text-sm">
          {failed ? (
            <span className="text-[var(--danger-label)]">导入失败：{data.parseError ?? '未知原因'}</span>
          ) : (
            <>
              <span className="max-w-full truncate">{data.originalFileName}</span>
              <span className="shrink-0 tabular-nums">{formatDateTime(data.createdAt)}</span>
              {parsing ? (
                <span className="motion-safe:animate-pulse">正在解析 PDF…</span>
              ) : (
                data.totalTasks > 0 && (
                  <>
                    <span className="hidden items-center gap-x-3 sm:inline-flex">
                      <Stat color="bg-[var(--success)]" label="通过" value={data.passedTasks} />
                      <Stat color="bg-[var(--warning)]" label="暂留" value={data.deferredTasks} />
                      <Stat color="bg-[var(--label-tertiary)]/50" label="待处理" value={data.pendingTasks} />
                    </span>
                  </>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: progress percent grouped with its bar + explicit primary action */}
      {!parsing && !failed && data.totalTasks > 0 && (
        <div className="relative z-10 flex min-w-0 flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3 text-xs text-[var(--label-secondary)]"><span>审核进度</span><span className="font-medium tabular-nums text-[var(--label-primary)]">{percent}%</span></div>
          <Progress value={processed} max={data.totalTasks} label={`审核进度 ${percent}%`} />
        </div>
      )}
      <div className="relative z-10 flex items-center gap-1 md:justify-end">
        {actionLabel && href && <Button asChild size="sm" variant={data.status === 'COMPLETED' ? 'secondary' : 'primary'} className="flex-1 sm:flex-none"><Link href={href}>{actionLabel}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></Button>}
        {failed && data.role === 'OWNER' && <Button size="sm" variant="secondary" className="flex-1 sm:flex-none" onClick={() => void retryParsing()}>重试解析</Button>}
        {!parsing && <Button asChild size="sm" variant="ghost" className="flex-1 sm:flex-none"><Link href={`/projects/${data.id}/tasks`}>任务总览</Link></Button>}
      </div>
    </div>
  )
}
