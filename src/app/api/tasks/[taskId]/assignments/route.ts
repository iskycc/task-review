import { NextRequest, NextResponse } from 'next/server'
import { assertSameOrigin, requireProjectRole, requireRequestUser } from '@/lib/auth'
import { apiError } from '@/lib/api'
import { prisma } from '@/lib/db'

type Params = { params: Promise<{ taskId: string }> }

async function taskProject(taskId: string) {
  return prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } })
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRequestUser(request)
    const { taskId } = await params
    const task = await taskProject(taskId)
    if (!task) return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    await requireProjectRole(task.projectId, user)
    const members = await prisma.projectMember.findMany({
      where: { projectId: task.projectId, role: { in: ['OWNER', 'REVIEWER'] } },
      include: { user: { select: { id: true, username: true, displayName: true } } },
    })
    const assigned = await prisma.taskAssignment.findMany({ where: { taskId }, select: { userId: true } })
    const ids = new Set(assigned.map((item) => item.userId))
    return NextResponse.json({ members: members.map((member) => ({ ...member.user, assigned: ids.has(member.userId) })) })
  } catch (error) { return apiError(error) }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(request)
    const user = await requireRequestUser(request)
    const { taskId } = await params
    const task = await taskProject(taskId)
    if (!task) return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    await requireProjectRole(task.projectId, user, ['OWNER'])
    const body = await request.json().catch(() => null)
    const userId = typeof body?.userId === 'string' ? body.userId : ''
    const assigned = body?.assigned === true
    const member = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: task.projectId, userId } } })
    if (!member || member.role === 'VIEWER') return NextResponse.json({ error: '该用户不是项目审核人' }, { status: 400 })
    if (assigned) await prisma.taskAssignment.upsert({ where: { taskId_userId: { taskId, userId } }, create: { taskId, userId }, update: {} })
    else await prisma.taskAssignment.deleteMany({ where: { taskId, userId } })
    return NextResponse.json({ ok: true })
  } catch (error) { return apiError(error) }
}
