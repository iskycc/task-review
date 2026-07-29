import { NextRequest, NextResponse } from 'next/server'
import { updateTaskReview, ServiceError } from '@/lib/services/review-service'

export const runtime = 'nodejs'

type Params = { params: Promise<{ taskId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { taskId } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body.projectId !== 'string' || typeof body.status !== 'string') {
    return NextResponse.json({ error: '请求参数不完整' }, { status: 400 })
  }
  try {
    const result = await updateTaskReview({
      projectId: body.projectId,
      taskId,
      status: body.status,
      remark: typeof body.remark === 'string' ? body.remark : undefined,
    })
    return NextResponse.json({
      task: {
        id: result.task.id,
        sequence: result.task.sequence,
        status: result.task.status,
        remark: result.task.remark,
      },
      project: {
        status: result.project.status,
        totalTasks: result.project.totalTasks,
        passedTasks: result.project.passedTasks,
        deferredTasks: result.project.deferredTasks,
        pendingTasks: result.project.pendingTasks,
      },
    })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[review] unexpected error:', error)
    return NextResponse.json({ error: '保存失败，请重试' }, { status: 500 })
  }
}
