import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { resetDb, createProjectWithTasks } from './helpers/db'
import { GET as getProject } from '@/app/api/projects/[projectId]/route'
import { GET as getTasks } from '@/app/api/projects/[projectId]/tasks/route'
import { GET as getTaskBySequence } from '@/app/api/projects/[projectId]/tasks/[sequence]/route'
import { makeJsonRequest } from './helpers/next-request'

async function setup() {
  const project = await createProjectWithTasks(['第一条', '第二条', '第三条'])
  const tasks = await prisma.task.findMany({ where: { projectId: project.id }, orderBy: { sequence: 'asc' } })
  return { project, tasks }
}

describe('GET /api/projects/[projectId]', () => {
  beforeEach(resetDb)

  it('returns project detail with sequences', async () => {
    const { project } = await setup()
    const res = await getProject(makeJsonRequest(`/api/projects/${project.id}`, 'GET'), {
      params: Promise.resolve({ projectId: project.id }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.project.id).toBe(project.id)
    expect(body.lastSequence).toBeNull()
    expect(body.firstPendingSequence).toBe(1)
  })

  it('returns 404 for unknown project', async () => {
    const res = await getProject(makeJsonRequest('/api/projects/nope', 'GET'), {
      params: Promise.resolve({ projectId: 'nope' }),
    })
    expect(res.status).toBe(404)
  })
})

describe('GET /api/projects/[projectId]/tasks/[sequence]', () => {
  beforeEach(resetDb)

  it('returns task by sequence', async () => {
    const { project } = await setup()
    const res = await getTaskBySequence(
      makeJsonRequest(`/api/projects/${project.id}/tasks/2`, 'GET'),
      { params: Promise.resolve({ projectId: project.id, sequence: '2' }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.task.content).toBe('第二条')
    expect(body.task.sequence).toBe(2)
    expect(body.totalTasks).toBe(3)
  })

  it('returns 404 for out-of-range sequence', async () => {
    const { project } = await setup()
    const res = await getTaskBySequence(
      makeJsonRequest(`/api/projects/${project.id}/tasks/9`, 'GET'),
      { params: Promise.resolve({ projectId: project.id, sequence: '9' }) },
    )
    expect(res.status).toBe(404)
  })
})

describe('GET /api/projects/[projectId]/tasks?status=', () => {
  beforeEach(resetDb)

  it('locates first task with given status', async () => {
    const { project, tasks } = await setup()
    await prisma.task.update({ where: { id: tasks[1].id }, data: { status: 'DEFERRED', remark: '待定' } })
    const res = await getTasks(
      makeJsonRequest(`/api/projects/${project.id}/tasks?status=DEFERRED`, 'GET'),
      { params: Promise.resolve({ projectId: project.id }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.task.sequence).toBe(2)
  })

  it('returns null task when none match', async () => {
    const { project } = await setup()
    const res = await getTasks(
      makeJsonRequest(`/api/projects/${project.id}/tasks?status=DEFERRED`, 'GET'),
      { params: Promise.resolve({ projectId: project.id }) },
    )
    expect((await res.json()).task).toBeNull()
  })

  it('rejects invalid status filter', async () => {
    const { project } = await setup()
    const res = await getTasks(
      makeJsonRequest(`/api/projects/${project.id}/tasks?status=BOGUS`, 'GET'),
      { params: Promise.resolve({ projectId: project.id }) },
    )
    expect(res.status).toBe(400)
  })
})
