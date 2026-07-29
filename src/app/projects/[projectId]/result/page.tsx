import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, PauseCircle, Circle, FileText, ArrowLeft } from 'lucide-react'
import { getProjectSummary } from '@/lib/services/project-service'
import { Button, Card, Progress } from '@/components/ui'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ projectId: string }> }

function RingProgress({ percent }: { percent: number }) {
  const safe = Math.min(100, Math.max(0, percent))
  const radius = 52
  const stroke = 10
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const offset = circumference - (safe / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={radius * 2} height={radius * 2} aria-hidden="true">
        <circle
          stroke="var(--surface-secondary)"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="var(--accent)"
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
          }}
        />
      </svg>
      <span className="absolute text-2xl font-semibold text-[var(--text-primary)]">{safe}%</span>
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

  const statItems = [
    { label: '任务总数', value: project.totalTasks, icon: FileText, variant: 'default' as const },
    { label: '已通过', value: project.passedTasks, icon: CheckCircle2, variant: 'success' as const },
    { label: '暂时遗留', value: project.deferredTasks, icon: PauseCircle, variant: 'warning' as const },
    { label: '待处理', value: project.pendingTasks, icon: Circle, variant: project.pendingTasks > 0 ? ('danger' as const) : ('default' as const) },
  ]

  return (
    <main className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回项目列表
          </Link>
        </Button>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{project.name}</h1>
      <p className="mt-1 text-[var(--text-secondary)]">审核结果</p>

      <Card className="mt-6 p-6 sm:p-8">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statItems.map(({ label, value, icon: Icon, variant }) => (
            <div key={label} className="rounded-xl bg-[var(--surface-secondary)] p-4">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-col items-center gap-4">
          <RingProgress percent={percent} />
          <p className="text-sm font-medium text-[var(--text-secondary)]">审核进度 {percent}%</p>
        </div>

        <div className="mt-6">
          <Progress value={processed} max={project.totalTasks} label={`审核进度 ${percent}%`} />
        </div>
      </Card>

      {project.pendingTasks > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--warning)]/20 bg-[var(--warning)]/10 p-4 text-sm text-[var(--warning)]">
          <PauseCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          已到达最后一条，仍有 {project.pendingTasks} 条待处理。
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {project.pendingTasks > 0 && firstPendingSequence !== null && (
          <Button asChild>
            <Link href={`/projects/${project.id}/review/${firstPendingSequence}`}>继续处理待处理任务</Link>
          </Button>
        )}
        {firstDeferredSequence !== null && (
          <Button asChild variant="warning">
            <Link href={`/projects/${project.id}/review/${firstDeferredSequence}`}>查看暂时遗留任务</Link>
          </Button>
        )}
        <Button asChild variant="secondary">
          <Link href="/">返回项目列表</Link>
        </Button>
      </div>
    </main>
  )
}
