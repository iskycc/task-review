import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProjectSummary } from '@/lib/services/project-service'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ projectId: string }> }

export default async function ResultPage({ params }: Params) {
  const { projectId } = await params
  const summary = await getProjectSummary(projectId)
  if (!summary) notFound()
  const { project, firstPendingSequence, firstDeferredSequence } = summary

  const processed = project.passedTasks + project.deferredTasks
  const percent = project.totalTasks > 0 ? Math.round((processed / project.totalTasks) * 100) : 0

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">{project.name} — 审核结果</h1>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-gray-500">任务总数</dt>
            <dd className="mt-1 text-xl font-semibold">{project.totalTasks}</dd>
          </div>
          <div>
            <dt className="text-gray-500">已通过</dt>
            <dd className="mt-1 text-xl font-semibold text-green-700">{project.passedTasks}</dd>
          </div>
          <div>
            <dt className="text-gray-500">暂时遗留</dt>
            <dd className="mt-1 text-xl font-semibold text-amber-700">{project.deferredTasks}</dd>
          </div>
          <div>
            <dt className="text-gray-500">待处理</dt>
            <dd className="mt-1 text-xl font-semibold text-gray-700">{project.pendingTasks}</dd>
          </div>
        </dl>
        <div
          className="mt-4 h-2 w-full rounded-full bg-gray-200"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`审核进度 ${percent}%`}
        >
          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-sm text-gray-600">审核进度 {percent}%</p>
      </div>

      {project.pendingTasks > 0 && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          已到达最后一条，仍有 {project.pendingTasks} 条待处理。
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {project.pendingTasks > 0 && firstPendingSequence !== null && (
          <Link
            href={`/projects/${project.id}/review/${firstPendingSequence}`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            继续处理待处理任务
          </Link>
        )}
        {firstDeferredSequence !== null && (
          <Link
            href={`/projects/${project.id}/review/${firstDeferredSequence}`}
            className="rounded-lg bg-amber-500 px-4 py-2 text-white hover:bg-amber-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          >
            查看暂时遗留任务
          </Link>
        )}
        <Link
          href="/"
          className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          返回项目列表
        </Link>
      </div>
    </main>
  )
}
