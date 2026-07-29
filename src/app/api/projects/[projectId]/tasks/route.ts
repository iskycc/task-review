import { NextRequest, NextResponse } from 'next/server'
import { getFirstTaskByStatus } from '@/lib/services/project-service'

export const runtime = 'nodejs'

const VALID_STATUSES = new Set(['PENDING', 'PASSED', 'DEFERRED'])

type Params = { params: Promise<{ projectId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { projectId } = await params
  const status = request.nextUrl.searchParams.get('status')
  if (!status || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: '无效的状态筛选' }, { status: 400 })
  }
  const task = await getFirstTaskByStatus(projectId, status)
  return NextResponse.json({
    task: task ? { id: task.id, sequence: task.sequence, status: task.status } : null,
  })
}
