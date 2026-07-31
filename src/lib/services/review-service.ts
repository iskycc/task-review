import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { validateReviewInput } from '@/lib/validation'

export class ServiceError extends Error {
  constructor(message: string, public statusCode = 400, public details?: unknown) {
    super(message)
    this.name = 'ServiceError'
  }
}

export function deriveProjectStatus(counts: { total: number; pending: number }) {
  if (counts.pending === 0 && counts.total > 0) return 'COMPLETED'
  if (counts.pending === counts.total) return 'READY'
  return 'REVIEWING'
}

export interface UpdateReviewInput {
  projectId: string
  taskId: string
  reviewerId?: string
  actorId?: string
  status: string
  remark?: string
  expectedVersion?: number
}

export async function updateTaskReview(input: UpdateReviewInput) {
  const reviewerId = input.reviewerId ?? (await prisma.projectMember.findFirst({ where: { projectId: input.projectId }, orderBy: { joinedAt: 'asc' } }))?.userId
  if (!reviewerId) throw new ServiceError('项目没有可用的审核人', 400)
  return prisma.$transaction(async (tx) => {
    const member = await tx.projectMember.findUnique({
      where: { projectId_userId: { projectId: input.projectId, userId: reviewerId } },
    })
    if (!member || !['OWNER', 'REVIEWER'].includes(member.role)) throw new ServiceError('没有审核此项目的权限', 403)
    const task = await tx.task.findFirst({ where: { id: input.taskId, projectId: input.projectId } })
    if (!task) throw new ServiceError('任务不存在', 404)
    const existing = await tx.taskReview.findUnique({
      where: { taskId_reviewerId: { taskId: input.taskId, reviewerId } },
    })
    const effectiveRemark = input.remark !== undefined ? input.remark.trim() : existing?.remark ?? undefined
    const validationError = validateReviewInput({ status: input.status, remark: effectiveRemark })
    if (validationError) throw new ServiceError(validationError)
    const normalizedRemark = effectiveRemark === '' ? null : effectiveRemark ?? null

    const expectedVersion = input.expectedVersion ?? existing?.version ?? 0
    if ((existing?.version ?? 0) !== expectedVersion) {
      throw new ServiceError('该任务已在其他页面被更新，请刷新后重试', 409, {
        current: existing ? { status: existing.status, remark: existing.remark, version: existing.version, reviewedAt: existing.reviewedAt } : { status: 'PENDING', remark: null, version: 0 },
      })
    }

    let review
    if (existing) {
      const changed = await tx.taskReview.updateMany({
        where: { id: existing.id, version: expectedVersion },
        data: { status: input.status, remark: normalizedRemark, reviewedAt: new Date(), version: { increment: 1 } },
      })
      if (changed.count !== 1) throw new ServiceError('该任务已被更新，请刷新后重试', 409)
      review = await tx.taskReview.findUniqueOrThrow({ where: { id: existing.id } })
    } else {
      try {
        review = await tx.taskReview.create({
          data: { taskId: input.taskId, reviewerId, status: input.status, remark: normalizedRemark, version: 1 },
        })
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ServiceError('该任务已被更新，请刷新后重试', 409)
        }
        throw error
      }
    }
    await tx.reviewEvent.create({
      data: {
        taskId: input.taskId,
        reviewerId,
        actorId: input.actorId ?? reviewerId,
        previousStatus: existing?.status ?? null,
        newStatus: review.status,
        previousRemark: existing?.remark ?? null,
        newRemark: review.remark,
        version: review.version,
      },
    })
    const grouped = await tx.taskReview.groupBy({
      by: ['status'],
      where: { reviewerId, task: { projectId: input.projectId } },
      _count: { _all: true },
    })
    const total = await tx.task.count({ where: { projectId: input.projectId } })
    const count = (status: string) => grouped.find((group) => group.status === status)?._count._all ?? 0
    const passed = count('PASSED')
    const deferred = count('DEFERRED')
    const status = deriveProjectStatus({ total, pending: Math.max(0, total - passed - deferred) })
    return {
      task: { id: task.id, sequence: task.sequence, status: review.status, remark: review.remark, reviewVersion: review.version, reviewedAt: review.reviewedAt },
      progress: { totalTasks: total, passedTasks: passed, deferredTasks: deferred, pendingTasks: Math.max(0, total - passed - deferred) },
      project: { status, totalTasks: total, passedTasks: passed, deferredTasks: deferred, pendingTasks: Math.max(0, total - passed - deferred) },
    }
  })
}

export async function updateLastPosition(projectId: string, taskId: string, userId?: string, filter = 'ALL') {
  const actualUserId = userId ?? (await prisma.projectMember.findFirst({ where: { projectId }, orderBy: { joinedAt: 'asc' } }))?.userId
  if (!actualUserId) throw new ServiceError('项目没有可用成员', 400)
  const [member, task] = await Promise.all([
    prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: actualUserId } } }),
    prisma.task.findFirst({ where: { id: taskId, projectId } }),
  ])
  if (!member) throw new ServiceError('项目不存在或无权访问', 404)
  if (!task) throw new ServiceError('任务不存在', 404)
  await prisma.reviewProgress.upsert({
    where: { projectId_userId: { projectId, userId: actualUserId } },
    create: { projectId, userId: actualUserId, lastTaskId: taskId, filter },
    update: { lastTaskId: taskId, filter },
  })
}
