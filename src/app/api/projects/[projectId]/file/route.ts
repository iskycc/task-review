import { readFile } from 'node:fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import { requireProjectRole, requireRequestUser } from '@/lib/auth'
import { apiError } from '@/lib/api'

type Params = { params: Promise<{ projectId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRequestUser(request)
    const { projectId } = await params
    const { project } = await requireProjectRole(projectId, user)
    const bytes = await readFile(project.filePath)
    return new NextResponse(bytes, { headers: { 'content-type': 'application/pdf', 'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(project.originalFileName)}`, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } })
  } catch (error) { return apiError(error, 'PDF 读取失败') }
}
