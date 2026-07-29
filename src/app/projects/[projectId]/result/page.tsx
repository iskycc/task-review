import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, PauseCircle, Circle, FileText, ArrowLeft, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getProjectSummary } from '@/lib/services/project-service'
import { Button, Card, Progress } from '@/components/ui'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ projectId: string }> }

type StatTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral'

const statToneClasses: Record<StatTone, { tile: string; chip: string; value: string }> = {
  accent: {
    tile: 'border-[var(--accent)]/20 bg-[var(--accent)]/[0.07]',
    chip: 'bg-[var(--accent)]/15 text-[var(--accent)]',
    value: 'text-[var(--accent)]',
  },
  success: {
    tile: 'border-[var(--success)]/20 bg-[var(--success)]/[0.07]',
    chip: 'bg-[var(--success)]/15 text-[var(--success)]',
    value: 'text-[var(--success)]',
  },
  warning: {
    tile: 'border-[var(--warning)]/25 bg-[var(--warning)]/[0.08]',
    chip: 'bg-[var(--warning)]/20 text-[var(--warning)]',
    value: 'text-[var(--warning)]',
  },
  danger: {
    tile: 'border-[var(--danger)]/20 bg-[var(--danger)]/[0.06]',
    chip: 'bg-[var(--danger)]/15 text-[var(--danger)]',
    value: 'text-[var(--danger)]',
  },
  neutral: {
    tile: 'border-[var(--border)] bg-[var(--surface-secondary)]',
    chip: 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)]',
    value: 'text-[var(--text-primary)]',
  },
}

function RingProgress({ percent }: { percent: number }) {
  const safe = Math.min(100, Math.max(0, percent))
  const radius = 76
  const stroke = 12
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const offset = circumference - (safe / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" aria-hidden="true">
      <svg width={radius * 2} height={radius * 2} aria-hidden="true">
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-hover)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle
          stroke="var(--surface-tertiary)"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="url(#ring-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{
            strokeDasharray: `${circumference} ${circumference}`,
            strokeDashoffset: offset,
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 300ms ease-out',
            filter: 'drop-shadow(0 4px 10px color-mix(in srgb, var(--accent) 35%, transparent))',
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-semibold tracking-tight text-[var(--text-primary)]">{safe}%</span>
        <span className="mt-1 text-xs font-medium text-[var(--text-secondary)]">已完成</span>
      </div>
    </div>
  )
}

export default async function ResultPage({ params }: Params) {
  const { projectId } = await params
  const summary = await getProjectSummary(projectId)
  if (!summary) notFound()
  const { project, firstPendingSequence, firstDeferredSequence } = summary

  const processed = project.passedTasks + project.deferredTasks
  const percent = project.totalTasks > 0 ? Math.round((processed / project.totalTasks) * 100) : 0

  const statItems: { label: string; value: number; icon: LucideIcon; tone: StatTone }[] = [
    { label: '任务总数', value: project.totalTasks, icon: FileText, tone: 'accent' },
    { label: '已通过', value: project.passedTasks, icon: CheckCircle2, tone: 'success' },
    { label: '暂时遗留', value: project.deferredTasks, icon: PauseCircle, tone: 'warning' },
    { label: '待处理', value: project.pendingTasks, icon: Circle, tone: project.pendingTasks > 0 ? 'danger' : 'neutral' },
  ]

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 sm:py-10">
      <div className="mb-8 flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回项目列表
          </Link>
        </Button>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{project.name}</h1>
      <p className="mt-1.5 text-[var(--text-secondary)]">审核结果</p>

      <Card className="mt-8 p-6 sm:p-10">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statItems.map(({ label, value, icon: Icon, tone }) => {
            const toneClass = statToneClasses[tone]
            return (
              <div
                key={label}
                className={`rounded-2xl border p-4 transition-transform duration-200 hover:-translate-y-0.5 ${toneClass.tile}`}
              >
                <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${toneClass.chip}`}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {label}
                </dt>
                <dd className={`mt-3 text-3xl font-semibold tracking-tight ${toneClass.value}`}>{value}</dd>
              </div>
            )
          })}
        </dl>

        <div className="mt-10 flex flex-col items-center gap-5">
          <div className="rounded-full bg-[var(--surface-secondary)] p-5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] dark:bg-[var(--surface-tertiary)]/50 dark:shadow-[inset_0_2px_10px_rgba(0,0,0,0.35)]">
            <RingProgress percent={percent} />
          </div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            已处理 {processed} / {project.totalTasks} 条
          </p>
        </div>

        <div className="mt-8">
          <Progress value={processed} max={project.totalTasks} label={`审核进度 ${percent}%`} />
        </div>
      </Card>

      {project.pendingTasks > 0 && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-[var(--warning)]/25 bg-[var(--warning)]/[0.08] p-5 shadow-[0_6px_20px_color-mix(in_srgb,var(--warning)_12%,transparent)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--warning)]/15 text-[var(--warning)]">
            <PauseCircle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="text-sm">
            <p className="font-semibold text-[var(--text-primary)]">仍有 {project.pendingTasks} 条待处理</p>
            <p className="mt-0.5 text-[var(--text-secondary)]">已到达最后一条，可继续处理剩余任务。</p>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {project.pendingTasks > 0 && firstPendingSequence !== null && (
          <Button asChild size="lg" className="shadow-[0_6px_20px_color-mix(in_srgb,var(--accent)_32%,transparent)]">
            <Link href={`/projects/${project.id}/review/${firstPendingSequence}`}>
              继续处理待处理任务
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
        {firstDeferredSequence !== null && (
          <Button asChild variant="warning" size="lg">
            <Link href={`/projects/${project.id}/review/${firstDeferredSequence}`}>查看暂时遗留任务</Link>
          </Button>
        )}
        <Button asChild variant="secondary" size="lg">
          <Link href="/">返回项目列表</Link>
        </Button>
      </div>
    </main>
  )
}
