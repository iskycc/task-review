import { NextRequest, NextResponse } from 'next/server'
import { assertSameOrigin, requireProjectRole, requireRequestUser } from '@/lib/auth'
import { apiError } from '@/lib/api'
import { prisma } from '@/lib/db'

type Params = { params: Promise<{ projectId: string }> }
const ROLES = new Set(['REVIEWER', 'VIEWER'])

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRequestUser(request)
    const { projectId } = await params
    await requireProjectRole(projectId, user)
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, username: true, displayName: true } } },
      orderBy: { joinedAt: 'asc' },
    })
    return NextResponse.json({ members: members.map(({ user: member, role, joinedAt }) => ({ ...member, role, joinedAt })) })
  } catch (error) { return apiError(error) }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(request)
    const user = await requireRequestUser(request)
    const { projectId } = await params
    await requireProjectRole(projectId, user, ['OWNER'])
    const body = await request.json().catch(() => null)
    const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : ''
    const role = typeof body?.role === 'string' ? body.role.toUpperCase() : 'REVIEWER'
    if (!username || !ROLES.has(role)) return NextResponse.json({ error: '成员信息无效' }, { status: 400 })
    const memberUser = await prisma.user.findUnique({ where: { username } })
    if (!memberUser) return NextResponse.json({ error: '用户不存在，请让对方先注册账号' }, { status: 404 })
    const membership = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: memberUser.id } },
      create: { projectId, userId: memberUser.id, role },
      update: { role },
    })
    return NextResponse.json({ member: { id: memberUser.id, username: memberUser.username, displayName: memberUser.displayName, role: membership.role } }, { status: 201 })
  } catch (error) { return apiError(error) }
}
