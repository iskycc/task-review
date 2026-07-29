import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { resetDb, createProjectWithTasks } from './helpers/db'

describe('database schema', () => {
  beforeEach(resetDb)

  it('creates project with tasks and enforces projectId+sequence uniqueness', async () => {
    const project = await createProjectWithTasks(['第一行', '第二行'])
    const tasks = await prisma.task.findMany({ where: { projectId: project.id } })
    expect(tasks).toHaveLength(2)
    await expect(
      prisma.task.create({
        data: { projectId: project.id, sequence: 1, content: '重复顺序号' },
      }),
    ).rejects.toThrow()
  })
})
