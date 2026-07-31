import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '@/lib/db'
import { PDF_MAX_SIZE_BYTES, PDF_MAX_SIZE_MB, PDF_PARSE_TIMEOUT_MS, TASK_CREATE_BATCH_SIZE, UPLOAD_DIR } from '@/lib/config'
import { extractLines } from '@/lib/pdf/extract-lines'

export type TaskFilter = 'ALL' | 'PENDING' | 'PASSED' | 'DEFERRED' | 'ASSIGNED'
export const TASK_FILTERS = new Set<TaskFilter>(['ALL', 'PENDING', 'PASSED', 'DEFERRED', 'ASSIGNED'])
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]

export type CreateProjectResult =
  | { ok: true; projectId: string; taskCount?: number; status: 'PARSING' | 'READY'; reused?: boolean }
  | { ok: false; status: number; reason: string }

function validatePdf(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.pdf')) return '仅支持 .pdf 文件'
  if (file.type !== 'application/pdf') return '文件类型必须是 application/pdf'
  if (file.size === 0) return '文件内容为空'
  if (file.size > PDF_MAX_SIZE_BYTES) return `文件大小超过 ${PDF_MAX_SIZE_MB} MB 限制`
  return null
}

export async function createProjectUpload(file: File, ownerId: string, uploadKey?: string): Promise<CreateProjectResult> {
  const validationError = validatePdf(file)
  if (validationError) return { ok: false, status: 400, reason: validationError }
  if (uploadKey) {
    const existing = await prisma.project.findUnique({ where: { ownerId_uploadKey: { ownerId, uploadKey } } })
    if (existing) return { ok: true, projectId: existing.id, status: existing.status === 'READY' ? 'READY' : 'PARSING', reused: true }
  }
  const ownedBytes = await prisma.project.aggregate({ where: { ownerId }, _sum: { fileSize: true } })
  const quota = Number(process.env.USER_STORAGE_QUOTA_MB ?? 1024) * 1024 * 1024
  if ((ownedBytes._sum.fileSize ?? 0) + file.size > quota) return { ok: false, status: 413, reason: '个人项目存储空间已达上限' }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.length < PDF_SIGNATURE.length || !PDF_SIGNATURE.every((byte, index) => bytes[index] === byte)) {
    return { ok: false, status: 400, reason: '文件不是有效的 PDF' }
  }
  await mkdir(UPLOAD_DIR, { recursive: true })
  const filePath = path.join(UPLOAD_DIR, `${randomUUID()}.pdf`)
  await writeFile(filePath, bytes, { flag: 'wx' })
  try {
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name: file.name.replace(/\.pdf$/i, '').trim() || '未命名项目',
          originalFileName: file.name,
          filePath,
          fileSize: file.size,
          status: 'PARSING',
          ownerId,
          uploadKey,
        },
      })
      await tx.projectMember.create({ data: { projectId: created.id, userId: ownerId, role: 'OWNER' } })
      return created
    })
    return { ok: true, projectId: project.id, status: 'PARSING' }
  } catch (error) {
    await unlink(filePath).catch(() => undefined)
    if (uploadKey) {
      const existing = await prisma.project.findUnique({ where: { ownerId_uploadKey: { ownerId, uploadKey } } })
      if (existing) return { ok: true, projectId: existing.id, status: existing.status === 'READY' ? 'READY' : 'PARSING', reused: true }
    }
    throw error
  }
}

export async function processProjectPdf(projectId: string) {
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000)
  const claimed = await prisma.project.updateMany({
    where: { id: projectId, status: 'PARSING', OR: [{ parseStartedAt: null }, { parseStartedAt: { lt: staleBefore } }] },
    data: { parseStartedAt: new Date(), parseAttempts: { increment: 1 }, parseError: null },
  })
  if (claimed.count === 0) return
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return
  const fail = async (reason: string) => {
    await prisma.$transaction([
      prisma.task.deleteMany({ where: { projectId } }),
      prisma.project.update({ where: { id: projectId }, data: { status: 'FAILED', parseError: reason, parseCompletedAt: new Date(), totalTasks: 0, pendingTasks: 0 } }),
    ])
  }
  try {
    const bytes = new Uint8Array(await readFile(project.filePath))
    let timeout: ReturnType<typeof setTimeout> | undefined
    const lines = await Promise.race([
      extractLines(bytes),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(Object.assign(new Error('PDF parse timeout'), { name: 'TimeoutError' })), PDF_PARSE_TIMEOUT_MS) }),
    ]).finally(() => { if (timeout) clearTimeout(timeout) })
    if (lines.length === 0) return fail('未解析出有效文本，可能是扫描件或空白 PDF，当前版本暂不支持')
    await prisma.$transaction(async (tx) => {
      await tx.task.deleteMany({ where: { projectId } })
      for (let index = 0; index < lines.length; index += TASK_CREATE_BATCH_SIZE) {
        const batch = lines.slice(index, index + TASK_CREATE_BATCH_SIZE)
        await tx.task.createMany({
          data: batch.map((line, offset) => ({
            projectId,
            sequence: index + offset + 1,
            content: line.content,
            pageNumber: line.pageNumber,
            lineNumber: line.lineNumber,
          })),
        })
      }
      await tx.project.update({
        where: { id: projectId },
        data: { status: 'READY', totalTasks: lines.length, pendingTasks: lines.length, passedTasks: 0, deferredTasks: 0, parseError: null, parseCompletedAt: new Date() },
      })
    })
  } catch (error) {
    const reason = (error as Error)?.name === 'PasswordException'
      ? 'PDF 已加密，当前版本暂不支持加密文件'
      : (error as Error)?.name === 'TimeoutError' ? 'PDF 解析超时，请重试或减小文件复杂度' : 'PDF 解析失败，文件可能已损坏，请更换文件重试'
    console.error(`[project-service] PDF parse failed for project ${projectId}:`, (error as Error)?.name ?? 'Error')
    await fail(reason)
  }
}

/** Backwards-compatible synchronous helper used by service tests and scripts. */
export async function createProjectFromPdf(file: File, ownerId?: string): Promise<CreateProjectResult> {
  let actualOwnerId = ownerId
  if (!actualOwnerId) {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
    actualOwnerId = user?.id
  }
  if (!actualOwnerId) return { ok: false, status: 401, reason: '请先创建账号' }
  const result = await createProjectUpload(file, actualOwnerId)
  if (!result.ok) return result
  await processProjectPdf(result.projectId)
  const project = await prisma.project.findUniqueOrThrow({ where: { id: result.projectId } })
  if (project.status === 'FAILED') return { ok: false, status: 422, reason: project.parseError ?? 'PDF 解析失败' }
  return { ok: true, projectId: project.id, taskCount: project.totalTasks, status: 'READY' }
}

function reviewWhere(userId: string, status?: string) {
  return { reviewerId: userId, ...(status ? { status } : {}) }
}

function filterWhere(projectId: string, userId: string, filter: TaskFilter, search?: string) {
  return {
    projectId,
    ...(search ? { content: { contains: search } } : {}),
    ...(filter === 'PENDING' ? { reviews: { none: { reviewerId: userId, status: { in: ['PASSED', 'DEFERRED'] } } } } : {}),
    ...(filter === 'PASSED' || filter === 'DEFERRED' ? { reviews: { some: reviewWhere(userId, filter) } } : {}),
    ...(filter === 'ASSIGNED' ? { assignments: { some: { userId } } } : {}),
  }
}

async function personalCounts(projectId: string, userId: string, total: number) {
  const grouped = await prisma.taskReview.groupBy({
    by: ['status'],
    where: { reviewerId: userId, task: { projectId } },
    _count: { _all: true },
  })
  const count = (status: string) => grouped.find((item) => item.status === status)?._count._all ?? 0
  const passed = count('PASSED')
  const deferred = count('DEFERRED')
  return { passed, deferred, pending: Math.max(0, total - passed - deferred) }
}

export async function listProjects(userId?: string, page = 1, pageSize = 50, search?: string) {
  const actualUserId = userId ?? (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }))?.id
  if (!actualUserId) return []
  const memberships = await prisma.projectMember.findMany({
    where: { userId: actualUserId, ...(search?.trim() ? { project: { name: { contains: search.trim() } } } : {}) },
    include: { project: true },
    orderBy: { project: { createdAt: 'desc' } },
    skip: (Math.max(1, page) - 1) * pageSize,
    take: Math.min(100, pageSize),
  })
  return Promise.all(memberships.map(async ({ project, role }) => {
    const [counts, progress] = await Promise.all([
      personalCounts(project.id, actualUserId, project.totalTasks),
      prisma.reviewProgress.findUnique({
        where: { projectId_userId: { projectId: project.id, userId: actualUserId } },
        include: { lastTask: { select: { sequence: true } } },
      }),
    ])
    const viewStatus = project.status === 'PARSING' || project.status === 'FAILED'
      ? project.status
      : counts.pending === 0 && project.totalTasks > 0 ? 'COMPLETED' : counts.pending === project.totalTasks ? 'READY' : 'REVIEWING'
    return {
      project: { ...project, status: viewStatus, passedTasks: counts.passed, deferredTasks: counts.deferred, pendingTasks: counts.pending },
      role,
      lastSequence: progress?.lastTask?.sequence ?? null,
    }
  }))
}

export function countProjects(userId: string, search?: string) {
  return prisma.projectMember.count({ where: { userId, ...(search?.trim() ? { project: { name: { contains: search.trim() } } } : {}) } })
}

export async function getProjectSummary(projectId: string, userId?: string) {
  const actualUserId = userId ?? (await prisma.projectMember.findFirst({ where: { projectId }, orderBy: { joinedAt: 'asc' } }))?.userId
  if (!actualUserId) return null
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: actualUserId } },
    include: { project: true },
  })
  if (!membership) return null
  const project = membership.project
  const [counts, progress, firstPending, firstDeferred] = await Promise.all([
    personalCounts(projectId, actualUserId, project.totalTasks),
    prisma.reviewProgress.findUnique({ where: { projectId_userId: { projectId, userId: actualUserId } }, include: { lastTask: { select: { sequence: true } } } }),
    prisma.task.findFirst({ where: filterWhere(projectId, actualUserId, 'PENDING'), orderBy: { sequence: 'asc' }, select: { sequence: true } }),
    prisma.task.findFirst({ where: filterWhere(projectId, actualUserId, 'DEFERRED'), orderBy: { sequence: 'asc' }, select: { sequence: true } }),
  ])
  const viewStatus = project.status === 'PARSING' || project.status === 'FAILED'
    ? project.status
    : counts.pending === 0 && project.totalTasks > 0 ? 'COMPLETED' : counts.pending === project.totalTasks ? 'READY' : 'REVIEWING'
  return {
    project: { ...project, status: viewStatus, passedTasks: counts.passed, deferredTasks: counts.deferred, pendingTasks: counts.pending },
    role: membership.role,
    lastSequence: progress?.lastTask?.sequence ?? null,
    firstPendingSequence: firstPending?.sequence ?? null,
    firstDeferredSequence: firstDeferred?.sequence ?? null,
  }
}

export async function getTaskBySequence(projectId: string, sequence: number, userId?: string) {
  const actualUserId = userId ?? (await prisma.projectMember.findFirst({ where: { projectId }, orderBy: { joinedAt: 'asc' } }))?.userId
  if (!actualUserId) return null
  const task = await prisma.task.findUnique({
    where: { projectId_sequence: { projectId, sequence } },
    include: {
      reviews: { where: { reviewerId: actualUserId }, take: 1 },
      assignments: { where: { userId: actualUserId }, select: { userId: true } },
    },
  })
  if (!task) return null
  const review = task.reviews[0]
  return {
    id: task.id,
    sequence: task.sequence,
    content: task.content,
    pageNumber: task.pageNumber,
    lineNumber: task.lineNumber,
    status: review?.status ?? 'PENDING',
    remark: review?.remark ?? null,
    reviewVersion: review?.version ?? 0,
    reviewedAt: review?.reviewedAt ?? null,
    assigned: task.assignments.length > 0,
  }
}

export async function getFirstTaskByStatus(projectId: string, status: TaskFilter, userId: string) {
  const task = await prisma.task.findFirst({ where: filterWhere(projectId, userId, status), orderBy: { sequence: 'asc' } })
  return task ? getTaskBySequence(projectId, task.sequence, userId) : null
}

export async function getAdjacentTask(projectId: string, userId: string, currentSequence: number, filter: TaskFilter, direction: 'next' | 'previous') {
  const task = await prisma.task.findFirst({
    where: { ...filterWhere(projectId, userId, filter), sequence: direction === 'next' ? { gt: currentSequence } : { lt: currentSequence } },
    orderBy: { sequence: direction === 'next' ? 'asc' : 'desc' },
    select: { sequence: true },
  })
  return task ? getTaskBySequence(projectId, task.sequence, userId) : null
}

export async function listTasks(projectId: string, userId: string, options: { filter: TaskFilter; search?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, options.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 30))
  const where = filterWhere(projectId, userId, options.filter, options.search?.trim())
  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({ where, orderBy: { sequence: 'asc' }, skip: (page - 1) * pageSize, take: pageSize, select: { sequence: true, content: true, pageNumber: true } }),
  ])
  const detailed = await Promise.all(tasks.map((task) => getTaskBySequence(projectId, task.sequence, userId)))
  return { tasks: detailed.filter(Boolean), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export async function removeProjectFile(filePath: string) {
  await unlink(filePath).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error })
}

export async function stageProjectFileRemoval(filePath: string) {
  const stagedPath = `${filePath}.deleting-${randomUUID()}`
  try {
    await rename(filePath, stagedPath)
    return stagedPath
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

export async function restoreProjectFile(stagedPath: string | null, filePath: string) {
  if (stagedPath) await rename(stagedPath, filePath)
}
