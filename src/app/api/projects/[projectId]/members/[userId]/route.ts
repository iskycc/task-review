import { NextRequest, NextResponse } from 'next/server'
import { assertSameOrigin, requireProjectRole, requireRequestUser } from '@/lib/auth'
import { apiError } from '@/lib/api'
import { prisma } from '@/lib/db'

type Params = { params: Promise<{ projectId: string; userId: string }> }

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(request)
    const user = await requireRequestUser(request)
    const { projectId, userId } = await params
    await requireProjectRole(projectId, user, ['OWNER'])
    const member = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } })
    if (!member) return NextResponse.json({ error: '成员不存在' }, { status: 404 })
    if (member.role === 'OWNER') return NextResponse.json({ error: '不能移除项目负责人' }, { status: 400 })
    await prisma.projectMember.delete({ where: { projectId_userId: { projectId, userId } } })
    return NextResponse.json({ ok: true })
  } catch (error) { return apiError(error) }
}
