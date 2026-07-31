import { NextRequest, NextResponse } from 'next/server'
import { getTaskBySequence } from '@/lib/services/project-service'
import { requireProjectRole, requireRequestUser } from '@/lib/auth'
import { apiError } from '@/lib/api'

export const runtime = 'nodejs'

type Params = { params: Promise<{ projectId: string; sequence: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
  const user = await requireRequestUser(request)
  const { projectId, sequence } = await params
  const { project } = await requireProjectRole(projectId, user)
  const seq = Number(sequence)
  if (!Number.isInteger(seq) || seq < 1) {
    return NextResponse.json({ error: '无效的任务序号' }, { status: 400 })
  }
  const task = await getTaskBySequence(projectId, seq, user.id)
  if (!task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 })
  }
  return NextResponse.json({
    task,
    totalTasks: project.totalTasks,
  })
  } catch (error) { return apiError(error) }
}
