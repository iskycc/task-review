'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ChevronRight, FileText } from 'lucide-react'
import { Button, Progress, Skeleton } from '@/components/ui'
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

function formatDate(date: Date) {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
    <div className="relative flex min-h-[80px] items-center gap-4 px-5 py-4 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-[var(--fill)]/50">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--fill)] text-[var(--label-tertiary)]">
        <FileText className="h-5 w-5" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        {parsing ? (
          <div aria-label="正在解析项目">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-4 w-44 max-w-[60%]" />
              <ProjectStatusBadge status={data.status} />
            </div>
            <Skeleton className="mt-2 h-3 w-64 max-w-[80%]" />
          </div>
        ) : (
          <>
            {/* Line 1: project name (stretched link makes the whole row clickable) + status */}
            <div className="flex items-center gap-2.5">
              {href ? (
                <Link
                  href={href}
                  className="truncate rounded-[var(--radius-sm)] text-card-title text-[var(--label-primary)] after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[var(--tint)]"
                >
                  {data.name}
                </Link>
              ) : (
                <h2 className="truncate text-card-title text-[var(--label-primary)]">{data.name}</h2>
              )}
              <span className="relative z-10 shrink-0">
                <ProjectStatusBadge status={data.status} />
              </span>
            </div>

            {/* Line 2: file name, created date, then compact review stats */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-auxiliary text-[var(--label-secondary)]">
              {failed ? (
                <span className="text-[var(--danger)]">导入失败：{data.parseError ?? '未知原因'}</span>
              ) : (
                <>
                  <span className="max-w-full truncate">{data.originalFileName}</span>
                  <span className="shrink-0 tabular-nums">{formatDate(data.createdAt)}</span>
                  {data.totalTasks > 0 && (
                    <>
                      <span className="inline-flex items-center gap-x-3">
                        <Stat color="bg-[var(--success)]" label="通过" value={data.passedTasks} />
                        <Stat color="bg-[var(--warning)]" label="暂留" value={data.deferredTasks} />
                        <Stat color="bg-[var(--label-tertiary)]/50" label="待处理" value={data.pendingTasks} />
                      </span>
                      <span className="font-semibold tabular-nums text-[var(--label-primary)] sm:hidden">
                        {percent}%
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: progress percent grouped with its bar + explicit primary action */}
      {!parsing && !failed && data.totalTasks > 0 && (
        <div className="relative z-10 hidden w-24 shrink-0 flex-col items-end gap-1.5 sm:flex">
          <span className="text-sm font-semibold tabular-nums text-[var(--label-primary)]">{percent}%</span>
          <Progress value={processed} max={data.totalTasks} label={`审核进度 ${percent}%`} />
        </div>
      )}

      {actionLabel && href && (
        <Button
          asChild
          size="sm"
          variant={data.status === 'COMPLETED' ? 'secondary' : 'primary'}
          className="relative z-10 shrink-0"
        >
          <Link href={href}>{actionLabel}</Link>
        </Button>
      )}

      {href && (
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--label-tertiary)]" aria-hidden="true" />
      )}
    </div>
  )
}
