import { NextRequest, NextResponse } from 'next/server'
import { getProjectSummary } from '@/lib/services/project-service'
import { assertSameOrigin, requireProjectRole, requireRequestUser } from '@/lib/auth'
import { apiError } from '@/lib/api'
import { prisma } from '@/lib/db'
import { removeProjectFile, restoreProjectFile, stageProjectFileRemoval } from '@/lib/services/project-service'

export const runtime = 'nodejs'

type Params = { params: Promise<{ projectId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
  const user = await requireRequestUser(request)
  const { projectId } = await params
  const summary = await getProjectSummary(projectId, user.id)
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
  } catch (error) { return apiError(error) }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(request)
    const user = await requireRequestUser(request)
    const { projectId } = await params
    await requireProjectRole(projectId, user, ['OWNER'])
    const body = await request.json().catch(() => null)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > 100) return NextResponse.json({ error: '项目名称须为 1–100 个字符' }, { status: 400 })
    const project = await prisma.project.update({ where: { id: projectId }, data: { name } })
    return NextResponse.json({ project: { id: project.id, name: project.name } })
  } catch (error) { return apiError(error) }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(request)
    const user = await requireRequestUser(request)
    const { projectId } = await params
    const { project } = await requireProjectRole(projectId, user, ['OWNER'])
    await prisma.project.update({ where: { id: projectId }, data: { status: 'DELETING' } })
    const stagedPath = await stageProjectFileRemoval(project.filePath)
    try {
      await prisma.project.delete({ where: { id: projectId } })
    } catch (error) {
      await restoreProjectFile(stagedPath, project.filePath).catch(() => undefined)
      await prisma.project.update({ where: { id: projectId }, data: { status: project.status } }).catch(() => undefined)
      throw error
    }
    if (stagedPath) await removeProjectFile(stagedPath).catch((error) => console.error('[project-delete] staged file cleanup failed:', error))
    return NextResponse.json({ ok: true })
  } catch (error) { return apiError(error, '删除失败，请重试') }
}
