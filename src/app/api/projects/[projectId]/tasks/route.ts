import { NextRequest, NextResponse } from 'next/server'
import { getAdjacentTask, getFirstTaskByStatus, listTasks, TASK_FILTERS, type TaskFilter } from '@/lib/services/project-service'
import { requireProjectRole, requireRequestUser } from '@/lib/auth'
import { apiError } from '@/lib/api'

export const runtime = 'nodejs'
type Params = { params: Promise<{ projectId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRequestUser(request)
    const { projectId } = await params
    await requireProjectRole(projectId, user)
    const rawFilter = (request.nextUrl.searchParams.get('filter') ?? request.nextUrl.searchParams.get('status') ?? 'ALL').toUpperCase()
    if (!TASK_FILTERS.has(rawFilter as TaskFilter)) return NextResponse.json({ error: '无效的状态筛选' }, { status: 400 })
    const filter = rawFilter as TaskFilter
    const direction = request.nextUrl.searchParams.get('direction')
    const current = Number(request.nextUrl.searchParams.get('current'))
    if ((direction === 'next' || direction === 'previous') && Number.isInteger(current)) {
      return NextResponse.json({ task: await getAdjacentTask(projectId, user.id, current, filter, direction) })
    }
    if (request.nextUrl.searchParams.has('status') || request.nextUrl.searchParams.get('first') === 'true') {
      return NextResponse.json({ task: await getFirstTaskByStatus(projectId, filter, user.id) })
    }
    const result = await listTasks(projectId, user.id, {
      filter,
      search: request.nextUrl.searchParams.get('search') ?? undefined,
      page: Number(request.nextUrl.searchParams.get('page') ?? 1),
      pageSize: Number(request.nextUrl.searchParams.get('pageSize') ?? 30),
    })
    return NextResponse.json(result)
  } catch (error) {
    return apiError(error)
  }
}
