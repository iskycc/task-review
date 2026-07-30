import { FileText } from 'lucide-react'
import { listProjects } from '@/lib/services/project-service'
import { Card, EmptyState } from '@/components/ui'
import { UploadButton } from '@/components/UploadButton'
import { ProjectCard } from '@/components/ProjectCard'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const items = await listProjects()

  return (
    <main className="mx-auto max-w-[1080px] px-6 py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--tint)]">PDF 任务审核</p>
          <h1 className="text-page-title mt-2 text-[var(--label-primary)]">项目</h1>
          <p className="text-body mt-3 text-[var(--label-secondary)]">上传 PDF 文档，自动解析为任务清单并逐项审核。</p>
        </div>
        {items.length > 0 && <UploadButton />}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" aria-hidden="true" />}
          title="还没有审核项目"
          description="上传 PDF 文件，自动解析并创建任务，开始你的第一次审核"
          action={<UploadButton />}
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-[var(--separator)]">
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
        </Card>
      )}
    </main>
  )
}
