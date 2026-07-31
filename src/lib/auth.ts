import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const SESSION_COOKIE = 'pdf_review_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_.-]{2,31}$/

export type AuthUser = { id: string; username: string; displayName: string; isAdmin: boolean }
export type ProjectRole = 'OWNER' | 'REVIEWER' | 'VIEWER'

export class AuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message)
    this.name = 'AuthError'
  }
}

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => {
      if (error) reject(error)
      else resolve(key as Buffer)
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt)
  return `scrypt$16384$8$1$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, n, r, p, saltText, hashText] = encoded.split('$')
  if (algorithm !== 'scrypt' || !saltText || !hashText || n !== '16384' || r !== '8' || p !== '1') return false
  const expected = Buffer.from(hashText, 'base64url')
  const actual = await scrypt(password, Buffer.from(saltText, 'base64url'))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function validateCredentials(input: { username: unknown; password: unknown; displayName?: unknown }) {
  const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : ''
  const password = typeof input.password === 'string' ? input.password : ''
  const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : username
  if (!USERNAME_PATTERN.test(username)) return { error: '用户名须为 3–32 位小写字母、数字、点、横线或下划线' } as const
  if (password.length < 10 || password.length > 128) return { error: '密码长度须为 10–128 位' } as const
  if (!displayName || displayName.length > 50) return { error: '显示名称须为 1–50 个字符' } as const
  return { username, password, displayName } as const
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('base64url')
}

export async function createSession(userId: string) {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
  await prisma.session.create({ data: { tokenHash: tokenHash(token), userId, expiresAt } })
  return { token, expiresAt }
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
    priority: 'high',
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 })
}

async function findUserByToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null
  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: { select: { id: true, username: true, displayName: true, isAdmin: true } } },
  })
  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
    return null
  }
  if (Date.now() - session.lastSeenAt.getTime() > 60 * 60 * 1000) {
    void prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined)
  }
  return session.user
}

export function getRequestUser(request: NextRequest) {
  return findUserByToken(request.cookies.get(SESSION_COOKIE)?.value)
}

export async function getCurrentUser() {
  const store = await cookies()
  return findUserByToken(store.get(SESSION_COOKIE)?.value)
}

export async function requireRequestUser(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) throw new AuthError('请先登录', 401)
  return user
}

export async function deleteRequestSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (token) await prisma.session.deleteMany({ where: { tokenHash: tokenHash(token) } })
}

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) throw new AuthError('请求来源无效', 403)
}

export async function requireProjectRole(projectId: string, user: AuthUser, roles: ProjectRole[] = ['OWNER', 'REVIEWER', 'VIEWER']) {
  if (user.isAdmin) {
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) throw new AuthError('项目不存在', 404)
    return { project, role: 'OWNER' as ProjectRole }
  }
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    include: { project: true },
  })
  if (!member) throw new AuthError('项目不存在或无权访问', 404)
  if (!roles.includes(member.role as ProjectRole)) throw new AuthError('没有执行此操作的权限', 403)
  return { project: member.project, role: member.role as ProjectRole }
}

export async function registerUser(input: { username: string; password: string; displayName: string }) {
  const passwordHash = await hashPassword(input.password)
  return prisma.$transaction(async (tx) => {
    const userCount = await tx.user.count()
    const user = await tx.user.create({
      data: { username: input.username, displayName: input.displayName, passwordHash, isAdmin: userCount === 0 },
      select: { id: true, username: true, displayName: true, isAdmin: true },
    })
    if (userCount === 0) {
      const legacyProjects = await tx.project.findMany({ where: { ownerId: null }, select: { id: true } })
      await tx.project.updateMany({ where: { ownerId: null }, data: { ownerId: user.id } })
      if (legacyProjects.length) {
        await tx.projectMember.createMany({ data: legacyProjects.map((project) => ({ projectId: project.id, userId: user.id, role: 'OWNER' })) })
        const legacyReviews = await tx.task.findMany({ where: { status: { in: ['PASSED', 'DEFERRED'] } } })
        if (legacyReviews.length) {
          await tx.taskReview.createMany({
            data: legacyReviews.map((task) => ({
              taskId: task.id,
              reviewerId: user.id,
              status: task.status,
              remark: task.remark,
              reviewedAt: task.reviewedAt ?? task.updatedAt,
            })),
          })
        }
      }
    }
    return user
  })
}
