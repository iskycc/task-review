import { after, NextRequest, NextResponse } from 'next/server'
import { createProjectUpload, listProjects, processProjectPdf } from '@/lib/services/project-service'
import { assertSameOrigin, requireRequestUser } from '@/lib/auth'
import { apiError } from '@/lib/api'
import { rateLimit, requestKey } from '@/lib/rate-limit'
import { PDF_MAX_SIZE_BYTES } from '@/lib/config'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    const user = await requireRequestUser(request)
    const limited = rateLimit(requestKey(request, `upload:${user.id}`), 10, 60 * 60 * 1000)
    if (!limited.allowed) return NextResponse.json({ error: '上传次数过多，请稍后再试' }, { status: 429, headers: { 'retry-after': String(limited.retryAfter) } })
    const contentLength = Number(request.headers.get('content-length') ?? 0)
    if (contentLength > PDF_MAX_SIZE_BYTES + 1024 * 1024) return NextResponse.json({ error: '请求体超过文件大小限制' }, { status: 413 })
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: '请选择要上传的 PDF 文件' }, { status: 400 })
    const uploadKey = request.headers.get('idempotency-key') ?? undefined
    const result = await createProjectUpload(file, user.id, uploadKey)
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: result.status })
    if (process.env.NODE_ENV === 'test') {
      await processProjectPdf(result.projectId)
      const project = await import('@/lib/db').then(({ prisma }) => prisma.project.findUniqueOrThrow({ where: { id: result.projectId } }))
      return NextResponse.json({ projectId: result.projectId, status: project.status, taskCount: project.totalTasks, reused: result.reused ?? false }, { status: result.reused ? 200 : 201 })
    }
    after(() => processProjectPdf(result.projectId))
    return NextResponse.json({ projectId: result.projectId, status: result.status, reused: result.reused ?? false }, { status: result.reused ? 200 : 202 })
  } catch (error) {
    return apiError(error, '上传失败，请重试')
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRequestUser(request)
    const page = Number(request.nextUrl.searchParams.get('page') ?? 1)
    const items = await listProjects(user.id, page)
    for (const { project } of items) if (project.status === 'PARSING') after(() => processProjectPdf(project.id))
    return NextResponse.json({
    projects: items.map(({ project, lastSequence }) => ({
      id: project.id,
      name: project.name,
      originalFileName: project.originalFileName,
      status: project.status,
      parseError: project.parseError,
      totalTasks: project.totalTasks,
      passedTasks: project.passedTasks,
      deferredTasks: project.deferredTasks,
      pendingTasks: project.pendingTasks,
      lastSequence,
      createdAt: project.createdAt,
    })),
  })
  } catch (error) {
    return apiError(error)
  }
}
