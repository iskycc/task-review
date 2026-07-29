import { NextRequest, NextResponse } from 'next/server'
import { getProjectSummary } from '@/lib/services/project-service'

export const runtime = 'nodejs'

type Params = { params: Promise<{ projectId: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { projectId } = await params
  const summary = await getProjectSummary(projectId)
  if (!summary) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 })
  }
  const { project } = summary
  return NextResponse.json({
    project: {
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
    },
    lastSequence: summary.lastSequence,
    firstPendingSequence: summary.firstPendingSequence,
    firstDeferredSequence: summary.firstDeferredSequence,
  })
}
