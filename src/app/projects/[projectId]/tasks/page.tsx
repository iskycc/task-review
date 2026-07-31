import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft, Search } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getProjectSummary, listTasks, TASK_FILTERS, type TaskFilter } from '@/lib/services/project-service'
import { Button } from '@/components/ui'
import { TaskStatusBadge } from '@/components/TaskStatusBadge'
import { TaskJump } from '@/components/TaskJump'
import { ProjectSettings } from '@/components/ProjectSettings'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ projectId: string }>; searchParams: Promise<{ filter?: string; search?: string; page?: string }> }

export default async function TasksPage({ params, searchParams }: Props) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const { projectId } = await params
  const query = await searchParams
  const rawFilter = query.filter?.toUpperCase() ?? 'ALL'
  const filter = (TASK_FILTERS.has(rawFilter as TaskFilter) ? rawFilter : 'ALL') as TaskFilter
  const summary = await getProjectSummary(projectId, user.id)
  if (!summary) notFound()
  const result = await listTasks(projectId, user.id, { filter, search: query.search, page: Number(query.page ?? 1), pageSize: 30 })
  const filters: { value: TaskFilter; label: string; count?: number }[] = [
    { value: 'ALL', label: '全部', count: summary.project.totalTasks },
    { value: 'PENDING', label: '待处理', count: summary.project.pendingTasks },
    { value: 'PASSED', label: '已通过', count: summary.project.passedTasks },
    { value: 'DEFERRED', label: '暂留', count: summary.project.deferredTasks },
    { value: 'ASSIGNED', label: '分配给我' },
  ]
  const filterQuery = filter === 'ALL' ? '' : `&filter=${filter}`
  return (
    <main className="editorial-shell py-8 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-3"><Link href="/"><ArrowLeft className="h-4 w-4" />返回项目列表</Link></Button>
        <div className="flex max-w-full flex-wrap items-center gap-2"><Button asChild size="sm" variant="secondary"><a href={`/api/projects/${projectId}/file`} target="_blank" rel="noreferrer">原 PDF</a></Button><Button asChild size="sm" variant="secondary"><a href={`/api/projects/${projectId}/export`}>导出 CSV</a></Button><TaskJump projectId={projectId} totalTasks={summary.project.totalTasks} />{summary.role === 'OWNER' && <ProjectSettings projectId={projectId} initialName={summary.project.name} />}</div>
      </div>
      <header className="mt-10 sm:mt-14"><p className="editorial-kicker">Task overview</p><h1 className="mt-4 max-w-4xl break-words text-[42px] font-semibold leading-[1.04] tracking-[-0.045em] text-[var(--label-primary)] sm:text-[64px]">{summary.project.name}</h1><div className="editorial-rule mt-6" aria-hidden="true" /><p className="mt-5 text-[15px] text-[var(--label-secondary)] sm:text-base">{summary.project.totalTasks} 条任务 · 显示当前账号的独立审核状态</p></header>
      <nav className="mt-10 flex max-w-full gap-6 overflow-x-auto border-b border-[var(--separator)] sm:mt-14 sm:gap-8" aria-label="任务筛选">
        {filters.map((item) => <Link key={item.value} href={`?filter=${item.value}${query.search ? `&search=${encodeURIComponent(query.search)}` : ''}`} aria-current={filter === item.value ? 'page' : undefined} className={`relative shrink-0 pb-3 text-sm font-medium transition-colors ${filter === item.value ? 'text-[var(--label-primary)] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-[var(--tint)]' : 'text-[var(--label-secondary)] hover:text-[var(--label-primary)]'}`}>{item.label}{item.count !== undefined ? ` ${item.count}` : ''}</Link>)}
      </nav>
      <form className="mt-5 flex gap-2 sm:ml-auto sm:max-w-lg" action={`/projects/${projectId}/tasks`}>
        <input type="hidden" name="filter" value={filter} />
        <label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[var(--label-tertiary)]" /><span className="sr-only">搜索任务内容</span><input name="search" defaultValue={query.search} placeholder="搜索任务内容" className="field-control pl-10" /></label>
        <Button type="submit" variant="secondary">搜索</Button>
      </form>
      <div className="paper-surface mt-5 overflow-hidden">
        {result.tasks.length ? <ul className="divide-y divide-[var(--separator)]">{result.tasks.map((task) => task && (
          <li key={task.id}><Link href={`/projects/${projectId}/review/${task.sequence}?filter=${filter}`} className="grid min-h-[92px] grid-cols-[42px_minmax(0,1fr)] gap-x-3 gap-y-3 px-4 py-4 transition-colors hover:bg-[var(--fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--tint)] sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:px-7"><span className="text-sm tabular-nums text-[var(--label-tertiary)]">{String(task.sequence).padStart(2, '0')}</span><span className="min-w-0"><span className="line-clamp-2 text-[15px] leading-6 text-[var(--label-primary)] sm:text-base">{task.content}</span><span className="mt-1.5 block truncate text-xs text-[var(--label-tertiary)]">{task.pageNumber ? `第 ${task.pageNumber} 页` : '无页码'}{task.remark ? ` · 备注：${task.remark}` : ''}</span></span><span className="col-start-2 justify-self-start sm:col-start-auto"><TaskStatusBadge status={task.status} /></span></Link></li>
        ))}</ul> : <div className="p-12 text-center text-sm text-[var(--label-secondary)]">没有符合条件的任务</div>}
      </div>
      {result.totalPages > 1 && <nav className="mt-5 flex items-center justify-center gap-3"><Button asChild variant="secondary" disabled={result.page <= 1}><Link href={`?page=${result.page - 1}${filterQuery}${query.search ? `&search=${encodeURIComponent(query.search)}` : ''}`}>上一页</Link></Button><span className="text-sm tabular-nums text-[var(--label-secondary)]">{result.page} / {result.totalPages}</span><Button asChild variant="secondary" disabled={result.page >= result.totalPages}><Link href={`?page=${result.page + 1}${filterQuery}${query.search ? `&search=${encodeURIComponent(query.search)}` : ''}`}>下一页</Link></Button></nav>}
    </main>
  )
}
