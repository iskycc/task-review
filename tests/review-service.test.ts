import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { resetDb, createProjectWithTasks } from './helpers/db'
import {
  deriveProjectStatus,
  updateTaskReview,
  updateLastPosition,
  ServiceError,
} from '@/lib/services/review-service'

describe('deriveProjectStatus', () => {
  it('READY when nothing processed', () => {
    expect(deriveProjectStatus({ total: 5, pending: 5 })).toBe('READY')
  })
  it('REVIEWING when partially processed', () => {
    expect(deriveProjectStatus({ total: 5, pending: 2 })).toBe('REVIEWING')
  })
  it('COMPLETED when no pending', () => {
    expect(deriveProjectStatus({ total: 5, pending: 0 })).toBe('COMPLETED')
  })
})

describe('updateTaskReview', () => {
  beforeEach(resetDb)

  it('passes a task and updates project counters in one transaction', async () => {
    const project = await createProjectWithTasks(['一', '二', '三'])
    const task = await prisma.task.findFirstOrThrow({ where: { projectId: project.id, sequence: 1 } })

    const result = await updateTaskReview({ projectId: project.id, taskId: task.id, status: 'PASSED' })
    expect(result.task.status).toBe('PASSED')
    expect(result.task.reviewedAt).not.toBeNull()
    expect(result.project.passedTasks).toBe(1)
    expect(result.project.pendingTasks).toBe(2)
    expect(result.project.status).toBe('REVIEWING')
  })

  it('defers a task with remark', async () => {
    const project = await createProjectWithTasks(['一', '二'])
    const task = await prisma.task.findFirstOrThrow({ where: { projectId: project.id, sequence: 1 } })
    const result = await updateTaskReview({
      projectId: project.id, taskId: task.id, status: 'DEFERRED', remark: '需要确认口径',
    })
    expect(result.task.status).toBe('DEFERRED')
    expect(result.task.remark).toBe('需要确认口径')
    expect(result.project.deferredTasks).toBe(1)
  })

  it('completes project when last pending task is processed', async () => {
    const project = await createProjectWithTasks(['一'])
    const task = await prisma.task.findFirstOrThrow({ where: { projectId: project.id, sequence: 1 } })
    const result = await updateTaskReview({ projectId: project.id, taskId: task.id, status: 'PASSED' })
    expect(result.project.status).toBe('COMPLETED')
    expect(result.project.pendingTasks).toBe(0)
  })

  it('rejects review for task not belonging to project', async () => {
    const p1 = await createProjectWithTasks(['一'])
    const p2 = await createProjectWithTasks(['二'])
    const task = await prisma.task.findFirstOrThrow({ where: { projectId: p1.id, sequence: 1 } })
    await expect(
      updateTaskReview({ projectId: p2.id, taskId: task.id, status: 'PASSED' }),
    ).rejects.toThrow(ServiceError)
  })

  it('rejects DEFERRED without remark and keeps state unchanged', async () => {
    const project = await createProjectWithTasks(['一'])
    const task = await prisma.task.findFirstOrThrow({ where: { projectId: project.id, sequence: 1 } })
    await expect(
      updateTaskReview({ projectId: project.id, taskId: task.id, status: 'DEFERRED', remark: '  ' }),
    ).rejects.toThrow('暂时遗留必须填写备注')
    expect((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status).toBe('PENDING')
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).status).toBe('READY')
  })

  it('is idempotent: applying same review twice yields same counters', async () => {
    const project = await createProjectWithTasks(['一', '二'])
    const task = await prisma.task.findFirstOrThrow({ where: { projectId: project.id, sequence: 1 } })
    await updateTaskReview({ projectId: project.id, taskId: task.id, status: 'PASSED' })
    const again = await updateTaskReview({ projectId: project.id, taskId: task.id, status: 'PASSED' })
    expect(again.project.passedTasks).toBe(1)
    expect(again.project.pendingTasks).toBe(1)
  })

  it('keeps remark when re-passing a deferred task without new remark', async () => {
    const project = await createProjectWithTasks(['一'])
    const task = await prisma.task.findFirstOrThrow({ where: { projectId: project.id, sequence: 1 } })
    await updateTaskReview({ projectId: project.id, taskId: task.id, status: 'DEFERRED', remark: '先放一放' })
    const result = await updateTaskReview({ projectId: project.id, taskId: task.id, status: 'PASSED' })
    expect(result.task.status).toBe('PASSED')
    expect(result.task.remark).toBe('先放一放')
  })

  it('can change a passed task to deferred with a remark', async () => {
    const project = await createProjectWithTasks(['一'])
    const task = await prisma.task.findFirstOrThrow({ where: { projectId: project.id, sequence: 1 } })
    await updateTaskReview({ projectId: project.id, taskId: task.id, status: 'PASSED' })
    const result = await updateTaskReview({
      projectId: project.id, taskId: task.id, status: 'DEFERRED', remark: '改判',
    })
    expect(result.task.status).toBe('DEFERRED')
    expect(result.project.passedTasks).toBe(0)
    expect(result.project.deferredTasks).toBe(1)
    expect(result.project.status).toBe('COMPLETED')
  })
})

describe('updateLastPosition', () => {
  beforeEach(resetDb)

  it('saves lastTaskId for resume', async () => {
    const project = await createProjectWithTasks(['一', '二'])
    const task = await prisma.task.findFirstOrThrow({ where: { projectId: project.id, sequence: 2 } })
    await updateLastPosition(project.id, task.id)
    const owner = await prisma.projectMember.findFirstOrThrow({ where: { projectId: project.id } })
    expect((await prisma.reviewProgress.findUniqueOrThrow({ where: { projectId_userId: { projectId: project.id, userId: owner.userId } } })).lastTaskId).toBe(task.id)
  })

  it('rejects task from another project', async () => {
    const p1 = await createProjectWithTasks(['一'])
    const p2 = await createProjectWithTasks(['二'])
    const task = await prisma.task.findFirstOrThrow({ where: { projectId: p1.id, sequence: 1 } })
    await expect(updateLastPosition(p2.id, task.id)).rejects.toThrow(ServiceError)
  })
})
