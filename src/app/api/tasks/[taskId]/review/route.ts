import { NextRequest, NextResponse } from 'next/server'
import { updateTaskReview, ServiceError } from '@/lib/services/review-service'
import { assertSameOrigin, requireRequestUser } from '@/lib/auth'
import { apiError } from '@/lib/api'

export const runtime = 'nodejs'

type Params = { params: Promise<{ taskId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
  assertSameOrigin(request)
  const user = await requireRequestUser(request)
  const { taskId } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body.projectId !== 'string' || typeof body.status !== 'string' || (body.expectedVersion !== undefined && !Number.isInteger(body.expectedVersion))) {
    return NextResponse.json({ error: '请求参数不完整' }, { status: 400 })
  }
    const result = await updateTaskReview({
      projectId: body.projectId,
      taskId,
      reviewerId: user.id,
      status: body.status,
      remark: typeof body.remark === 'string' ? body.remark : undefined,
      expectedVersion: body.expectedVersion ?? 0,
    })
    return NextResponse.json({
      task: {
        ...result.task,
      },
      progress: result.progress,
      project: result.project,
    })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return apiError(error, '保存失败，请重试')
  }
}
