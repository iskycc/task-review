import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { assertSameOrigin, createSession, registerUser, setSessionCookie, validateCredentials } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/api'
import { rateLimit, requestKey } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    const limited = rateLimit(requestKey(request, 'register'), 5, 15 * 60 * 1000)
    if (!limited.allowed) return NextResponse.json({ error: '尝试次数过多，请稍后再试' }, { status: 429, headers: { 'retry-after': String(limited.retryAfter) } })
    const body = await request.json().catch(() => null)
    const validated = validateCredentials(body ?? {})
    if ('error' in validated) return NextResponse.json({ error: validated.error }, { status: 400 })
    const hasUsers = (await prisma.user.count()) > 0
    if (hasUsers && process.env.ALLOW_REGISTRATION === 'false') {
      return NextResponse.json({ error: '管理员已关闭公开注册' }, { status: 403 })
    }
    const user = await registerUser(validated)
    const session = await createSession(user.id)
    const response = NextResponse.json({ user }, { status: 201 })
    setSessionCookie(response, session.token, session.expiresAt)
    return response
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: '用户名已存在' }, { status: 409 })
    }
    return apiError(error, '注册失败，请重试')
  }
}
