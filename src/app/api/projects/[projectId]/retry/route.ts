import { after, NextRequest, NextResponse } from 'next/server'
import { assertSameOrigin, requireProjectRole, requireRequestUser } from '@/lib/auth'
import { apiError } from '@/lib/api'
import { prisma } from '@/lib/db'
import { processProjectPdf } from '@/lib/services/project-service'

type Params = { params: Promise<{ projectId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(request)
    const user = await requireRequestUser(request)
    const { projectId } = await params
    const { project } = await requireProjectRole(projectId, user, ['OWNER'])
    if (project.status !== 'FAILED') return NextResponse.json({ error: '只有解析失败的项目可以重试' }, { status: 400 })
    await prisma.project.update({ where: { id: projectId }, data: { status: 'PARSING', parseError: null, parseStartedAt: null, parseCompletedAt: null } })
    after(() => processProjectPdf(projectId))
    return NextResponse.json({ ok: true }, { status: 202 })
  } catch (error) { return apiError(error) }
}
