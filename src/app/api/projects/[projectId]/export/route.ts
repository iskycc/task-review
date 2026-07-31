import { NextRequest, NextResponse } from 'next/server'
import { requireProjectRole, requireRequestUser } from '@/lib/auth'
import { apiError } from '@/lib/api'
import { prisma } from '@/lib/db'

type Params = { params: Promise<{ projectId: string }> }
function csv(value: unknown) { return `"${String(value ?? '').replaceAll('"', '""')}"` }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRequestUser(request)
    const { projectId } = await params
    const { project } = await requireProjectRole(projectId, user)
    const tasks = await prisma.task.findMany({
      where: { projectId }, orderBy: { sequence: 'asc' },
      include: { reviews: { where: { reviewerId: user.id }, take: 1 } },
    })
    const rows = [['序号', '页码', '行号', '任务内容', '我的状态', '我的备注', '审核时间'].map(csv).join(',')]
    for (const task of tasks) {
      const review = task.reviews[0]
      rows.push([task.sequence, task.pageNumber, task.lineNumber, task.content, review?.status ?? 'PENDING', review?.remark, review?.reviewedAt?.toISOString()].map(csv).join(','))
    }
    const filename = `${project.name.replace(/[\\/:*?"<>|]/g, '_')}-review.csv`
    return new NextResponse(`\uFEFF${rows.join('\r\n')}`, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`, 'cache-control': 'private, no-store' } })
  } catch (error) { return apiError(error, '导出失败') }
}
