import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, PauseCircle, Circle, FileText, ArrowLeft, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getProjectSummary } from '@/lib/services/project-service'
import { Button } from '@/components/ui'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ projectId: string }> }

function CompletionProgress({ percent }: { percent: number }) {
  const safe = Math.min(100, Math.max(0, percent))
  return (
    <div>
      <span className="block text-[72px] font-semibold leading-none tracking-[-0.065em] tabular-nums text-[var(--label-primary)] sm:text-[108px]">{safe}<span className="ml-1 text-[0.42em] tracking-[-0.03em] text-[var(--label-secondary)]">%</span></span>
      <span className="mt-3 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--label-secondary)]">Completed</span>
    </div>
  )
}

export default async function ResultPage({ params }: Params) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const { projectId } = await params
  const summary = await getProjectSummary(projectId, user.id)
  if (!summary) notFound()
  const { project, firstPendingSequence, firstDeferredSequence } = summary

  const processed = project.passedTasks + project.deferredTasks
  const percent = project.totalTasks > 0 ? Math.round((processed / project.totalTasks) * 100) : 0
  const isComplete = project.pendingTasks === 0

  const statItems: { label: string; value: number; icon: LucideIcon; iconClass: string }[] = [
    { label: '任务总数', value: project.totalTasks, icon: FileText, iconClass: 'text-[var(--tint)]' },
    { label: '已通过', value: project.passedTasks, icon: CheckCircle2, iconClass: 'text-[var(--success-label)]' },
    { label: '暂时遗留', value: project.deferredTasks, icon: PauseCircle, iconClass: 'text-[var(--warning-label)]' },
    {
      label: '待处理',
      value: project.pendingTasks,
      icon: Circle,
      iconClass: project.pendingTasks > 0 ? 'text-[var(--danger-label)]' : 'text-[var(--label-tertiary)]',
    },
  ]

  const canContinuePending = project.pendingTasks > 0 && firstPendingSequence !== null
  const hasDeferred = firstDeferredSequence !== null

  return (
    <main className="editorial-shell py-8 sm:py-14">
      <div className="mb-8 flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回项目列表
          </Link>
        </Button>
      </div>

      <p className="editorial-kicker">Review summary</p>
      <h1 className="mt-4 max-w-4xl break-words text-[42px] font-semibold leading-[1.04] tracking-[-0.045em] text-[var(--label-primary)] sm:text-[64px]">{project.name}</h1>
      <div className="editorial-rule mt-6" aria-hidden="true" />

      <section className="paper-surface mt-10 grid gap-10 p-6 sm:mt-14 sm:p-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16 lg:p-14">
        <div className="flex flex-col justify-between">
          <CompletionProgress percent={percent} />
          <h2 className="mt-10 flex items-center gap-2 text-[24px] font-semibold tracking-[-0.025em] text-[var(--label-primary)]">
            {isComplete ? (
              <CheckCircle2 className="h-6 w-6 text-[var(--success-label)] motion-safe:animate-pop-in" aria-hidden="true" />
            ) : (
              <Circle className="h-6 w-6 text-[var(--warning-label)]" aria-hidden="true" />
            )}
            {isComplete ? '审核完成' : `还剩 ${project.pendingTasks} 条待处理`}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--label-secondary)]">
            {isComplete
              ? `共 ${project.totalTasks} 条任务，已全部处理`
              : `已处理 ${processed} / ${project.totalTasks} 条，可继续完成剩余任务`}
          </p>
        </div>
        <dl className="grid grid-cols-2 border-l-0 border-t border-[var(--separator)] pt-6 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
          {statItems.map(({ label, value, icon: Icon, iconClass }) => (
            <div key={label} className="border-b border-[var(--separator)] px-2 py-6 odd:border-r sm:px-5">
              <dt className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-[var(--label-secondary)]">
                <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} aria-hidden="true" />
                {label}
              </dt>
              <dd className="mt-3 text-4xl font-semibold tracking-[-0.04em] tabular-nums text-[var(--label-primary)] sm:text-5xl">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button asChild variant="secondary" size="lg" className="h-auto w-full whitespace-normal py-3 text-center text-sm sm:h-12 sm:w-auto sm:whitespace-nowrap sm:py-0 sm:text-base">
          <Link href={`/projects/${project.id}/tasks`}>查看全部任务</Link>
        </Button>
        <Button asChild variant="secondary" size="lg" className="h-auto w-full whitespace-normal py-3 text-center text-sm sm:h-12 sm:w-auto sm:whitespace-nowrap sm:py-0 sm:text-base"><a href={`/api/projects/${project.id}/export`}>导出我的审核结果</a></Button>
        {canContinuePending && (
          <Button asChild size="lg" className="h-auto w-full whitespace-normal py-3 text-center text-sm sm:h-12 sm:w-auto sm:whitespace-nowrap sm:py-0 sm:text-base">
            <Link href={`/projects/${project.id}/review/${firstPendingSequence}?filter=PENDING`}>
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
            className="h-auto w-full whitespace-normal py-3 text-center text-sm sm:h-12 sm:w-auto sm:whitespace-nowrap sm:py-0 sm:text-base"
          >
            <Link href={`/projects/${project.id}/review/${firstDeferredSequence}?filter=DEFERRED`}>
              查看暂时遗留任务（{project.deferredTasks}）
            </Link>
          </Button>
        )}
        <Button asChild variant="ghost" size="lg" className="h-auto w-full whitespace-normal py-3 text-center text-sm sm:h-12 sm:w-auto sm:whitespace-nowrap sm:py-0 sm:text-base">
          <Link href="/">返回项目列表</Link>
        </Button>
      </div>
    </main>
  )
}
