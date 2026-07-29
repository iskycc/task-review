import { NextRequest, NextResponse } from 'next/server'
import { updateLastPosition, ServiceError } from '@/lib/services/review-service'

export const runtime = 'nodejs'

type Params = { params: Promise<{ projectId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { projectId } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body.taskId !== 'string') {
    return NextResponse.json({ error: '请求参数不完整' }, { status: 400 })
  }
  try {
    await updateLastPosition(projectId, body.taskId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[progress] unexpected error:', error)
    return NextResponse.json({ error: '保存失败' }, { status: 500 })
  }
}
