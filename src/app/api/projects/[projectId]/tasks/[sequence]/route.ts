import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTaskBySequence } from '@/lib/services/project-service'

export const runtime = 'nodejs'

type Params = { params: Promise<{ projectId: string; sequence: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { projectId, sequence } = await params
  const seq = Number(sequence)
  if (!Number.isInteger(seq) || seq < 1) {
    return NextResponse.json({ error: '无效的任务序号' }, { status: 400 })
  }
  const task = await getTaskBySequence(projectId, seq)
  if (!task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 })
  }
  const totalTasks = await prisma.task.count({ where: { projectId } })
  return NextResponse.json({
    task: {
      id: task.id,
      sequence: task.sequence,
      content: task.content,
      pageNumber: task.pageNumber,
      lineNumber: task.lineNumber,
      status: task.status,
      remark: task.remark,
    },
    totalTasks,
  })
}
