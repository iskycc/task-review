import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getProjectSummary, getTaskBySequence } from '@/lib/services/project-service'
import { ReviewClient } from '@/components/ReviewClient'

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
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-gray-700">项目正在解析中，请稍后在项目列表重新进入。</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">返回项目列表</Link>
      </main>
    )
  }
  if (project.status === 'FAILED' || project.totalTasks === 0) {
    redirect('/')
  }

  // Out-of-range sequence → back to a valid position (last position or first task)
  if (!Number.isInteger(seq) || seq < 1 || seq > project.totalTasks) {
    redirect(`/projects/${projectId}/review/${summary.lastSequence ?? 1}`)
  }
  const task = await getTaskBySequence(projectId, seq)
  if (!task) {
    redirect(`/projects/${projectId}/review/${summary.lastSequence ?? 1}`)
  }

  return (
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
  )
}
