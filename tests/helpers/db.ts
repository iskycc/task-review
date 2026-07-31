import { prisma } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { setTestSessionToken } from './next-request'

export async function resetDb() {
  await prisma.reviewEvent.deleteMany()
  await prisma.taskAssignment.deleteMany()
  await prisma.reviewProgress.deleteMany()
  await prisma.taskReview.deleteMany()
  await prisma.session.deleteMany()
  await prisma.task.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
  const user = await prisma.user.create({ data: { username: 'tester', displayName: '测试用户', passwordHash: 'test', isAdmin: true } })
  const session = await createSession(user.id)
  setTestSessionToken(session.token)
  return user
}

export async function createProjectWithTasks(
  contents: string[],
  overrides: Partial<{ name: string; status: string }> = {},
) {
  const owner = await prisma.user.findFirstOrThrow({ orderBy: { createdAt: 'asc' } })
  const project = await prisma.project.create({
    data: {
      name: overrides.name ?? '测试项目',
      originalFileName: 'sample.pdf',
      filePath: 'data/uploads/test.pdf',
      fileSize: 1024,
      status: overrides.status ?? 'READY',
      totalTasks: contents.length,
      pendingTasks: contents.length,
      ownerId: owner.id,
    },
  })
  await prisma.projectMember.create({ data: { projectId: project.id, userId: owner.id, role: 'OWNER' } })
  await prisma.task.createMany({
    data: contents.map((content, i) => ({
      projectId: project.id,
      sequence: i + 1,
      content,
      pageNumber: 1,
      lineNumber: i + 1,
    })),
  })
  return project
}
