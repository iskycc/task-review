import { FileText } from 'lucide-react'
import { listProjects } from '@/lib/services/project-service'
import { UploadButton } from '@/components/UploadButton'
import { ProjectCard } from '@/components/ProjectCard'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const items = await listProjects()

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <div className="mb-10 flex items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">项目</h1>
          <p className="mt-2 text-lg text-[var(--text-secondary)]">上传 PDF，逐项审核任务</p>
        </div>
        <UploadButton />
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-24 text-center shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-none">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
            <FileText className="h-10 w-10" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">还没有审核项目</h2>
          <p className="mt-2 max-w-sm leading-relaxed text-[var(--text-secondary)]">
            上传 PDF 文件，自动解析并创建任务，开始你的第一次审核
          </p>
        </div>
      ) : (
        <ul className="space-y-5">
          {items.map(({ project, lastSequence }) => (
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
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
