import { prisma } from '@/lib/db'

export async function resetDb() {
  await prisma.task.deleteMany()
  await prisma.project.deleteMany()
}

export async function createProjectWithTasks(
  contents: string[],
  overrides: Partial<{ name: string; status: string }> = {},
) {
  const project = await prisma.project.create({
    data: {
      name: overrides.name ?? '测试项目',
      originalFileName: 'sample.pdf',
      filePath: 'data/uploads/test.pdf',
      fileSize: 1024,
      status: overrides.status ?? 'READY',
      totalTasks: contents.length,
      pendingTasks: contents.length,
    },
  })
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
