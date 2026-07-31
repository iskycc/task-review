import { NextRequest, NextResponse } from 'next/server'
import { assertSameOrigin, createSession, setSessionCookie, validateCredentials, verifyPassword } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/api'
import { rateLimit, requestKey } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    const limited = rateLimit(requestKey(request, 'login'), 10, 15 * 60 * 1000)
    if (!limited.allowed) return NextResponse.json({ error: '尝试次数过多，请稍后再试' }, { status: 429, headers: { 'retry-after': String(limited.retryAfter) } })
    const body = await request.json().catch(() => null)
    const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!username || !password) return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 })
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }
    const session = await createSession(user.id)
    const response = NextResponse.json({ user: { id: user.id, username: user.username, displayName: user.displayName, isAdmin: user.isAdmin } })
    setSessionCookie(response, session.token, session.expiresAt)
    return response
  } catch (error) {
    return apiError(error, '登录失败，请重试')
  }
}
