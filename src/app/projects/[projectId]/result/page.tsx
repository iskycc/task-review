import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, PauseCircle, Circle, FileText, ArrowLeft, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getProjectSummary } from '@/lib/services/project-service'
import { Button, Card } from '@/components/ui'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ projectId: string }> }

function RingProgress({ percent }: { percent: number }) {
  const safe = Math.min(100, Math.max(0, percent))
  const radius = 76
  const stroke = 10
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const offset = circumference - (safe / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={radius * 2} height={radius * 2} aria-hidden="true">
        <circle
          stroke="var(--fill)"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="var(--tint)"
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
            transition: 'stroke-dashoffset var(--duration-base) var(--ease-out)',
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-semibold tracking-tight tabular-nums text-[var(--label-primary)]">{safe}%</span>
        <span className="mt-1 text-xs font-medium text-[var(--label-secondary)]">已完成</span>
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
  const isComplete = project.pendingTasks === 0

  const statItems: { label: string; value: number; icon: LucideIcon; iconClass: string }[] = [
    { label: '任务总数', value: project.totalTasks, icon: FileText, iconClass: 'text-[var(--tint)]' },
    { label: '已通过', value: project.passedTasks, icon: CheckCircle2, iconClass: 'text-[var(--success)]' },
    { label: '暂时遗留', value: project.deferredTasks, icon: PauseCircle, iconClass: 'text-[var(--warning)]' },
    {
      label: '待处理',
      value: project.pendingTasks,
      icon: Circle,
      iconClass: project.pendingTasks > 0 ? 'text-[var(--danger)]' : 'text-[var(--label-tertiary)]',
    },
  ]

  const canContinuePending = project.pendingTasks > 0 && firstPendingSequence !== null
  const hasDeferred = firstDeferredSequence !== null

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 sm:py-10">
      <div className="mb-8 flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回项目列表
          </Link>
        </Button>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight text-[var(--label-primary)]">{project.name}</h1>
      <p className="mt-1.5 text-[var(--label-secondary)]">审核结果</p>

      <Card className="mt-8 p-6 sm:p-10">
        <div className="flex flex-col items-center text-center">
          <RingProgress percent={percent} />
          <h2 className="text-section-title mt-6 flex items-center gap-2 text-[var(--label-primary)]">
            {isComplete ? (
              <CheckCircle2 className="h-6 w-6 text-[var(--success)]" aria-hidden="true" />
            ) : (
              <Circle className="h-6 w-6 text-[var(--warning)]" aria-hidden="true" />
            )}
            {isComplete ? '审核完成' : `还剩 ${project.pendingTasks} 条待处理`}
          </h2>
          <p className="mt-2 text-sm text-[var(--label-secondary)]">
            {isComplete
              ? `共 ${project.totalTasks} 条任务，已全部处理`
              : `已处理 ${processed} / ${project.totalTasks} 条，可继续完成剩余任务`}
          </p>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-4 sm:gap-4">
          {statItems.map(({ label, value, icon: Icon, iconClass }) => (
            <div key={label} className="rounded-[var(--radius-md)] bg-[var(--fill)] p-4">
              <dt className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-[var(--label-secondary)]">
                <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} aria-hidden="true" />
                {label}
              </dt>
              <dd className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-[var(--label-primary)]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {canContinuePending && (
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={`/projects/${project.id}/review/${firstPendingSequence}`}>
              继续处理待处理任务（{project.pendingTasks}）
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
        {hasDeferred && (
          <Button
            asChild
            variant={canContinuePending ? 'secondary' : 'primary'}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Link href={`/projects/${project.id}/review/${firstDeferredSequence}`}>
              查看暂时遗留任务（{project.deferredTasks}）
            </Link>
          </Button>
        )}
        <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
          <Link href="/">返回项目列表</Link>
        </Button>
      </div>
    </main>
  )
}
