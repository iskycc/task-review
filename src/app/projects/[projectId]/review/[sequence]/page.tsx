import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getProjectSummary, getTaskBySequence, TASK_FILTERS, type TaskFilter } from '@/lib/services/project-service'
import { ReviewClient } from '@/components/ReviewClient'
import { Button } from '@/components/ui'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ projectId: string; sequence: string }>; searchParams: Promise<{ filter?: string }> }

export default async function ReviewPage({ params, searchParams }: Params) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const { projectId, sequence } = await params
  const requestedFilter = (await searchParams).filter?.toUpperCase() ?? 'ALL'
  const filter = (TASK_FILTERS.has(requestedFilter as TaskFilter) ? requestedFilter : 'ALL') as TaskFilter
  const seq = Number(sequence)

  const summary = await getProjectSummary(projectId, user.id)
  if (!summary) notFound()
  const { project } = summary

  if (project.status === 'PARSING') {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="text-lg text-[var(--label-secondary)]">项目正在解析中，请稍后在项目列表重新进入。</p>
        <Button variant="secondary" asChild className="mt-8">
          <Link href="/">返回项目列表</Link>
        </Button>
      </main>
    )
  }
  if (project.status === 'FAILED' || project.totalTasks === 0) {
    redirect('/')
  }

  if (!Number.isInteger(seq) || seq < 1 || seq > project.totalTasks) {
    redirect(`/projects/${projectId}/review/${summary.lastSequence ?? 1}`)
  }
  const task = await getTaskBySequence(projectId, seq, user.id)
  if (!task) {
    redirect(`/projects/${projectId}/review/${summary.lastSequence ?? 1}`)
  }

  return (
    <main className="editorial-shell pb-8 pt-5 sm:pb-12 sm:pt-8">
      {/* Top zone: back entry + project name. */}
      <div className="mb-8 flex items-center justify-between gap-4 sm:mb-10">
        <Button variant="ghost" size="sm" asChild className="-ml-3 shrink-0">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回项目列表
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild className="-mr-3"><Link href={`/projects/${projectId}/tasks`}>任务总览</Link></Button>
      </div>

      <ReviewClient
        project={{ id: project.id, name: project.name, totalTasks: project.totalTasks }}
        initialTask={{
          id: task.id,
          sequence: task.sequence,
          content: task.content,
          pageNumber: task.pageNumber,
          status: task.status,
          remark: task.remark,
          reviewVersion: task.reviewVersion,
          reviewedAt: task.reviewedAt ? task.reviewedAt.toISOString() : null,
          assigned: task.assigned,
        }}
        initialProcessed={project.passedTasks + project.deferredTasks}
        initialFilter={filter}
        canReview={summary.role !== 'VIEWER'}
        canManage={summary.role === 'OWNER'}
      />
    </main>
  )
}
