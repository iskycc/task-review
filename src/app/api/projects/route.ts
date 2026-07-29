import { NextRequest, NextResponse } from 'next/server'
import { createProjectFromPdf, listProjects } from '@/lib/services/project-service'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '请选择要上传的 PDF 文件' }, { status: 400 })
  }
  const result = await createProjectFromPdf(file)
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: result.status })
  }
  return NextResponse.json(
    { projectId: result.projectId, taskCount: result.taskCount },
    { status: 201 },
  )
}

export async function GET() {
  const items = await listProjects()
  return NextResponse.json({
    projects: items.map(({ project, lastSequence }) => ({
      id: project.id,
      name: project.name,
      originalFileName: project.originalFileName,
      status: project.status,
      parseError: project.parseError,
      totalTasks: project.totalTasks,
      passedTasks: project.passedTasks,
      deferredTasks: project.deferredTasks,
      pendingTasks: project.pendingTasks,
      lastSequence,
      createdAt: project.createdAt,
    })),
  })
}
