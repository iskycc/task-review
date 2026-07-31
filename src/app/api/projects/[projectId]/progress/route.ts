import { NextRequest, NextResponse } from 'next/server'
import { updateLastPosition, ServiceError } from '@/lib/services/review-service'
import { assertSameOrigin, requireRequestUser } from '@/lib/auth'
import { apiError } from '@/lib/api'

export const runtime = 'nodejs'

type Params = { params: Promise<{ projectId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { projectId } = await params
  try {
  assertSameOrigin(request)
  const user = await requireRequestUser(request)
  const body = await request.json().catch(() => null)
  if (!body || typeof body.taskId !== 'string') {
    return NextResponse.json({ error: '请求参数不完整' }, { status: 400 })
  }
    await updateLastPosition(projectId, body.taskId, user.id, typeof body.filter === 'string' ? body.filter : 'ALL')
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return apiError(error, '保存失败')
  }
}
