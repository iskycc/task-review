import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { resetDb, createProjectWithTasks } from './helpers/db'
import { PATCH as patchReview } from '@/app/api/tasks/[taskId]/review/route'
import { PATCH as patchProgress } from '@/app/api/projects/[projectId]/progress/route'
import { makeJsonRequest } from './helpers/next-request'

async function setup() {
  const project = await createProjectWithTasks(['第一条', '第二条'])
  const tasks = await prisma.task.findMany({ where: { projectId: project.id }, orderBy: { sequence: 'asc' } })
  return { project, tasks }
}

describe('PATCH /api/tasks/[taskId]/review', () => {
  beforeEach(resetDb)

  it('passes a task and returns updated summary', async () => {
    const { project, tasks } = await setup()
    const res = await patchReview(
      makeJsonRequest(`/api/tasks/${tasks[0].id}/review`, 'PATCH', { projectId: project.id, status: 'PASSED' }),
      { params: Promise.resolve({ taskId: tasks[0].id }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.task.status).toBe('PASSED')
    expect(body.project.passedTasks).toBe(1)
    expect(body.project.status).toBe('REVIEWING')
  })

  it('rejects DEFERRED without remark', async () => {
    const { project, tasks } = await setup()
    const res = await patchReview(
      makeJsonRequest(`/api/tasks/${tasks[0].id}/review`, 'PATCH', { projectId: project.id, status: 'DEFERRED' }),
      { params: Promise.resolve({ taskId: tasks[0].id }) },
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('暂时遗留必须填写备注')
  })

  it('returns 404 when task does not belong to project', async () => {
    const { project } = await setup()
    const other = await createProjectWithTasks(['别的'])
    const otherTask = await prisma.task.findFirstOrThrow({ where: { projectId: other.id } })
    const res = await patchReview(
      makeJsonRequest(`/api/tasks/${otherTask.id}/review`, 'PATCH', { projectId: project.id, status: 'PASSED' }),
      { params: Promise.resolve({ taskId: otherTask.id }) },
    )
    expect(res.status).toBe(404)
  })

  it('rejects invalid status', async () => {
    const { project, tasks } = await setup()
    const res = await patchReview(
      makeJsonRequest(`/api/tasks/${tasks[0].id}/review`, 'PATCH', { projectId: project.id, status: 'SKIP' }),
      { params: Promise.resolve({ taskId: tasks[0].id }) },
    )
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/projects/[projectId]/progress', () => {
  beforeEach(resetDb)

  it('saves last position', async () => {
    const { project, tasks } = await setup()
    const res = await patchProgress(
      makeJsonRequest(`/api/projects/${project.id}/progress`, 'PATCH', { taskId: tasks[1].id }),
      { params: Promise.resolve({ projectId: project.id }) },
    )
    expect(res.status).toBe(200)
    const owner = await prisma.projectMember.findFirstOrThrow({ where: { projectId: project.id } })
    expect((await prisma.reviewProgress.findUniqueOrThrow({ where: { projectId_userId: { projectId: project.id, userId: owner.userId } } })).lastTaskId).toBe(tasks[1].id)
  })

  it('returns 404 for task of another project', async () => {
    const { project } = await setup()
    const other = await createProjectWithTasks(['别的'])
    const otherTask = await prisma.task.findFirstOrThrow({ where: { projectId: other.id } })
    const res = await patchProgress(
      makeJsonRequest(`/api/projects/${project.id}/progress`, 'PATCH', { taskId: otherTask.id }),
      { params: Promise.resolve({ projectId: project.id }) },
    )
    expect(res.status).toBe(404)
  })
})
