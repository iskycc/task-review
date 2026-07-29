import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getProjectSummary, getTaskBySequence } from '@/lib/services/project-service'
import { ReviewClient } from '@/components/ReviewClient'
import { Button } from '@/components/ui'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ projectId: string; sequence: string }> }

export default async function ReviewPage({ params }: Params) {
  const { projectId, sequence } = await params
  const seq = Number(sequence)

  const summary = await getProjectSummary(projectId)
  if (!summary) notFound()
  const { project } = summary

  if (project.status === 'PARSING') {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12 text-center">
        <p className="text-[var(--text-secondary)]">项目正在解析中，请稍后在项目列表重新进入。</p>
        <Button variant="secondary" asChild className="mt-6">
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
  const task = await getTaskBySequence(projectId, seq)
  if (!task) {
    redirect(`/projects/${projectId}/review/${summary.lastSequence ?? 1}`)
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回项目列表
          </Link>
        </Button>
        <span className="text-sm font-medium text-[var(--text-secondary)]">{project.name}</span>
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
        }}
        initialProcessed={project.passedTasks + project.deferredTasks}
      />
    </main>
  )
}
