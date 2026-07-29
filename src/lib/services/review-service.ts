import { prisma } from '@/lib/db'
import { validateReviewInput } from '@/lib/validation'

export class ServiceError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message)
    this.name = 'ServiceError'
  }
}

export function deriveProjectStatus(counts: { total: number; pending: number }): string {
  if (counts.pending === 0 && counts.total > 0) return 'COMPLETED'
  if (counts.pending === counts.total) return 'READY'
  return 'REVIEWING'
}

export interface UpdateReviewInput {
  projectId: string
  taskId: string
  status: string
  /** When provided, overwrites the remark; when omitted, the historical remark is kept. */
  remark?: string
}

export async function updateTaskReview(input: UpdateReviewInput) {
  const validationError = validateReviewInput({ status: input.status, remark: input.remark })
  if (validationError) throw new ServiceError(validationError)

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirst({ where: { id: input.taskId, projectId: input.projectId } })
    if (!task) throw new ServiceError('任务不存在', 404)

    // For DEFERRED without a newly provided remark, the effective (existing)
    // remark must still be non-blank — e.g. switching PASSED -> DEFERRED
    // requires a new remark, while re-deferring may reuse the old one.
    if (input.status === 'DEFERRED') {
      const effectiveRemark = input.remark !== undefined ? input.remark : task.remark ?? ''
      if (effectiveRemark.trim().length === 0) {
        throw new ServiceError('暂时遗留必须填写备注')
      }
    }

    const updatedTask = await tx.task.update({
      where: { id: task.id },
      data: {
        status: input.status,
        ...(input.remark !== undefined ? { remark: input.remark === '' ? null : input.remark } : {}),
        reviewedAt: new Date(),
      },
    })

    const grouped = await tx.task.groupBy({
      by: ['status'],
      where: { projectId: input.projectId },
      _count: { _all: true },
    })
    const countOf = (status: string) =>
      grouped.find((g) => g.status === status)?._count._all ?? 0
    const passed = countOf('PASSED')
    const deferred = countOf('DEFERRED')
    const pending = countOf('PENDING')
    const total = passed + deferred + pending

    const project = await tx.project.update({
      where: { id: input.projectId },
      data: {
        passedTasks: passed,
        deferredTasks: deferred,
        pendingTasks: pending,
        totalTasks: total,
        status: deriveProjectStatus({ total, pending }),
      },
    })

    return { task: updatedTask, project }
  })
}

export async function updateLastPosition(projectId: string, taskId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, projectId } })
  if (!task) throw new ServiceError('任务不存在', 404)
  await prisma.project.update({ where: { id: projectId }, data: { lastTaskId: taskId } })
}
