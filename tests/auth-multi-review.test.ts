import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/db'
import { createSession, hashPassword, verifyPassword } from '@/lib/auth'
import { getAdjacentTask, getProjectSummary, getTaskBySequence, listProjects, listTasks } from '@/lib/services/project-service'
import { ServiceError, updateTaskReview } from '@/lib/services/review-service'
import { GET as getProjects } from '@/app/api/projects/route'
import { GET as getTask } from '@/app/api/projects/[projectId]/tasks/[sequence]/route'
import { createProjectWithTasks, resetDb } from './helpers/db'
import { makeJsonRequest, setTestSessionToken } from './helpers/next-request'

describe('authentication and isolated reviews', () => {
  beforeEach(resetDb)

  it('hashes passwords and rejects a wrong password', async () => {
    const encoded = await hashPassword('correct horse battery staple')
    expect(encoded).not.toContain('correct horse')
    expect(await verifyPassword('correct horse battery staple', encoded)).toBe(true)
    expect(await verifyPassword('wrong password', encoded)).toBe(false)
  })

  it('rejects anonymous project listing', async () => {
    setTestSessionToken('')
    const response = await getProjects(makeJsonRequest('/api/projects', 'GET'))
    expect(response.status).toBe(401)
  })

  it('does not reveal a project to a non-member', async () => {
    const project = await createProjectWithTasks(['secret'])
    const outsider = await prisma.user.create({ data: { username: 'outsider', displayName: '外部用户', passwordHash: 'test' } })
    const session = await createSession(outsider.id)
    setTestSessionToken(session.token)
    const response = await getTask(makeJsonRequest(`/api/projects/${project.id}/tasks/1`, 'GET'), {
      params: Promise.resolve({ projectId: project.id, sequence: '1' }),
    })
    expect(response.status).toBe(404)
  })

  it('keeps status, remark, counts and resume state separate per reviewer', async () => {
    const project = await createProjectWithTasks(['one', 'two'])
    const owner = await prisma.projectMember.findFirstOrThrow({ where: { projectId: project.id } })
    const reviewer = await prisma.user.create({ data: { username: 'reviewer', displayName: '审核人', passwordHash: 'test' } })
    await prisma.projectMember.create({ data: { projectId: project.id, userId: reviewer.id, role: 'REVIEWER' } })
    const task = await prisma.task.findFirstOrThrow({ where: { projectId: project.id, sequence: 1 } })
    await updateTaskReview({ projectId: project.id, taskId: task.id, reviewerId: owner.userId, status: 'PASSED', expectedVersion: 0 })
    await updateTaskReview({ projectId: project.id, taskId: task.id, reviewerId: reviewer.id, status: 'DEFERRED', remark: '需要确认', expectedVersion: 0 })

    expect((await getTaskBySequence(project.id, 1, owner.userId))?.status).toBe('PASSED')
    expect((await getTaskBySequence(project.id, 1, reviewer.id))?.status).toBe('DEFERRED')
    expect((await getProjectSummary(project.id, owner.userId))?.project.passedTasks).toBe(1)
    expect((await getProjectSummary(project.id, reviewer.id))?.project.deferredTasks).toBe(1)
    expect(await listProjects(reviewer.id)).toHaveLength(1)
  })

  it('detects a stale write and appends an audit event', async () => {
    const project = await createProjectWithTasks(['one'])
    const owner = await prisma.projectMember.findFirstOrThrow({ where: { projectId: project.id } })
    const task = await prisma.task.findFirstOrThrow({ where: { projectId: project.id } })
    await updateTaskReview({ projectId: project.id, taskId: task.id, reviewerId: owner.userId, status: 'PASSED', expectedVersion: 0 })
    await expect(updateTaskReview({ projectId: project.id, taskId: task.id, reviewerId: owner.userId, status: 'DEFERRED', remark: 'stale', expectedVersion: 0 }))
      .rejects.toMatchObject({ statusCode: 409 })
    expect(await prisma.reviewEvent.count({ where: { taskId: task.id } })).toBe(1)
  })

  it('navigates and lists within the selected status queue', async () => {
    const project = await createProjectWithTasks(['one', 'two', 'three', 'four'])
    const owner = await prisma.projectMember.findFirstOrThrow({ where: { projectId: project.id } })
    const tasks = await prisma.task.findMany({ where: { projectId: project.id }, orderBy: { sequence: 'asc' } })
    await updateTaskReview({ projectId: project.id, taskId: tasks[0].id, reviewerId: owner.userId, status: 'DEFERRED', remark: 'a', expectedVersion: 0 })
    await updateTaskReview({ projectId: project.id, taskId: tasks[1].id, reviewerId: owner.userId, status: 'PASSED', expectedVersion: 0 })
    await updateTaskReview({ projectId: project.id, taskId: tasks[2].id, reviewerId: owner.userId, status: 'DEFERRED', remark: 'b', expectedVersion: 0 })
    expect((await getAdjacentTask(project.id, owner.userId, 1, 'DEFERRED', 'next'))?.sequence).toBe(3)
    const deferred = await listTasks(project.id, owner.userId, { filter: 'DEFERRED' })
    expect(deferred.tasks.map((task) => task?.sequence)).toEqual([1, 3])
    const pending = await listTasks(project.id, owner.userId, { filter: 'PENDING' })
    expect(pending.tasks.map((task) => task?.sequence)).toEqual([4])
  })
})
