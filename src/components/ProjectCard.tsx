import Link from 'next/link'
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

export function ProjectCard({ data }: { data: ProjectCardData }) {
  const processed = data.passedTasks + data.deferredTasks
  const percent = data.totalTasks > 0 ? Math.round((processed / data.totalTasks) * 100) : 0

  let entry: React.ReactNode = null
  if (data.status === 'READY' || data.status === 'REVIEWING') {
    const label = data.status === 'READY' ? '开始审核' : '继续审核'
    const seq = data.lastSequence ?? 1
    entry = (
      <Link
        href={`/projects/${data.id}/review/${seq}`}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {label}
      </Link>
    )
  } else if (data.status === 'COMPLETED') {
    entry = (
      <Link
        href={`/projects/${data.id}/result`}
        className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-white hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700"
      >
        查看结果
      </Link>
    )
  }

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{data.name}</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {data.originalFileName} · {data.createdAt.toLocaleString('zh-CN')}
          </p>
        </div>
        <ProjectStatusBadge status={data.status} />
      </div>

      {data.status === 'PARSING' && <p className="mt-3 text-sm text-gray-600">正在解析 PDF 并创建任务…</p>}
      {data.status === 'FAILED' && (
        <p className="mt-3 text-sm text-red-700">导入失败：{data.parseError ?? '未知原因'}</p>
      )}

      {data.totalTasks > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>
              共 {data.totalTasks} 条 · 已通过 {data.passedTasks} · 暂留 {data.deferredTasks} · 待处理{' '}
              {data.pendingTasks}
            </span>
            <span>{percent}%</span>
          </div>
          <div
            className="mt-1 h-2 w-full rounded-full bg-gray-200"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`审核进度 ${percent}%`}
          >
            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {entry && <div className="mt-4">{entry}</div>}
    </li>
  )
}
