import { FileText } from 'lucide-react'
import { listProjects } from '@/lib/services/project-service'
import { UploadButton } from '@/components/UploadButton'
import { ProjectCard } from '@/components/ProjectCard'
import { Button } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const items = await listProjects()

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Projects</h1>
          <p className="mt-1 text-[var(--text-secondary)]">上传 PDF，逐项审核任务</p>
        </div>
        <UploadButton />
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
            <FileText className="h-8 w-8" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">还没有审核项目</h2>
          <p className="mt-1 text-[var(--text-secondary)]">点击右上角“上传 PDF”创建第一个 Project</p>
          <div className="mt-6">
            <Button>上传 PDF</Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
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
