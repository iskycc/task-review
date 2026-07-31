import { NextRequest, NextResponse } from 'next/server'
import { requireProjectRole, requireRequestUser } from '@/lib/auth'
import { apiError } from '@/lib/api'
import { prisma } from '@/lib/db'

type Params = { params: Promise<{ taskId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRequestUser(request)
    const { taskId } = await params
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } })
    if (!task) return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    await requireProjectRole(task.projectId, user)
    const events = await prisma.reviewEvent.findMany({
      where: { taskId },
      include: {
        reviewer: { select: { id: true, displayName: true, username: true } },
        actor: { select: { id: true, displayName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ events })
  } catch (error) { return apiError(error) }
}
