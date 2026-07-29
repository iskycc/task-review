import { listProjects } from '@/lib/services/project-service'
import { UploadButton } from '@/components/UploadButton'
import { ProjectCard } from '@/components/ProjectCard'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const items = await listProjects()

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PDF Task Review</h1>
        <UploadButton />
      </div>

      {items.length === 0 ? (
        <div className="mt-16 rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          <p>还没有审核项目。</p>
          <p className="mt-1">点击右上角“上传 PDF”创建第一个 Project。</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map(({ project, lastSequence }) => (
            <ProjectCard
              key={project.id}
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
          ))}
        </ul>
      )}
    </main>
  )
}
