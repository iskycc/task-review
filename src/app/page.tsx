import { FileText, Search } from 'lucide-react'
import { countProjects, listProjects, processProjectPdf } from '@/lib/services/project-service'
import { after } from 'next/server'
import { EmptyState } from '@/components/ui'
import { UploadButton } from '@/components/UploadButton'
import { ProjectCard } from '@/components/ProjectCard'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default async function HomePage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const query = await searchParams
  const page = Math.max(1, Number(query.page ?? 1) || 1)
  const [items, totalProjects] = await Promise.all([listProjects(user.id, page, 50, query.search), countProjects(user.id, query.search)])
  const totalPages = Math.max(1, Math.ceil(totalProjects / 50))
  for (const { project } of items) if (project.status === 'PARSING') after(() => processProjectPdf(project.id))

  return (
    <main className="editorial-shell py-12 sm:py-20">
      <div className="mb-10 flex flex-col gap-8 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="editorial-kicker">Workspace</p>
          <h1 className="editorial-display mt-4 text-[var(--label-primary)]">我的项目</h1>
          <div className="editorial-rule mt-6" aria-hidden="true" />
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-[var(--label-secondary)] sm:text-[17px]">从文档到决策。上传 PDF，系统会拆解任务并保留每位审核人的独立进度。</p>
        </div>
        {items.length > 0 && <UploadButton />}
      </div>
      {totalProjects > 0 || query.search ? <form className="mb-5 flex gap-2 sm:ml-auto sm:max-w-md"><label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[var(--label-tertiary)]" aria-hidden="true" /><span className="sr-only">搜索项目名称</span><input name="search" defaultValue={query.search} placeholder="搜索项目" className="field-control pl-10" /></label><Button type="submit" variant="secondary">搜索</Button></form> : null}

      {items.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" aria-hidden="true" />}
          title="还没有审核项目"
          description="上传 PDF 文件，自动解析并创建任务，开始你的第一次审核"
          action={<UploadButton />}
        />
      ) : (
        <div className="paper-surface overflow-hidden">
          <ul className="divide-y divide-[var(--separator)]">
            {items.map(({ project, lastSequence, role }) => (
              <li key={project.id}>
                <ProjectCard
                  data={{
                    id: project.id,
                    name: project.name,
                    originalFileName: project.originalFileName,
                    status: project.status,
                    parseError: project.parseError,
                    totalTasks: project.totalTasks,
                    passedTasks: project.passedTasks,
                    deferredTasks: project.deferredTasks,
                    pendingTasks: project.pendingTasks,
                    createdAt: project.createdAt,
                    lastSequence,
                    role,
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      {totalPages > 1 && <nav className="mt-6 flex items-center justify-center gap-3"><Button asChild variant="secondary" disabled={page <= 1}><Link href={`/?page=${page - 1}${query.search ? `&search=${encodeURIComponent(query.search)}` : ''}`}>上一页</Link></Button><span className="text-sm tabular-nums text-[var(--label-secondary)]">{page} / {totalPages}</span><Button asChild variant="secondary" disabled={page >= totalPages}><Link href={`/?page=${page + 1}${query.search ? `&search=${encodeURIComponent(query.search)}` : ''}`}>下一页</Link></Button></nav>}
    </main>
  )
}
