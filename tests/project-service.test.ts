import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { resetDb } from './helpers/db'
import { createSamplePdfBuffer } from './helpers/sample-pdf'
import {
  createProjectFromPdf,
  listProjects,
  getProjectSummary,
  getTaskBySequence,
} from '@/lib/services/project-service'

function makeFile(buffer: Buffer, name = '需求文档.pdf', type = 'application/pdf') {
  // Wrap in Uint8Array: Buffer's ArrayBufferLike typing is not a BlobPart under TS 5.9.
  return new File([new Uint8Array(buffer)], name, { type })
}

describe('createProjectFromPdf', () => {
  beforeEach(resetDb)

  it('creates a READY project with 20 ordered tasks from a valid pdf', async () => {
    const result = await createProjectFromPdf(makeFile(await createSamplePdfBuffer()))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.taskCount).toBe(20)

    const project = await prisma.project.findUniqueOrThrow({ where: { id: result.projectId } })
    expect(project.name).toBe('需求文档')
    expect(project.status).toBe('READY')
    expect(project.totalTasks).toBe(20)
    expect(project.pendingTasks).toBe(20)

    const tasks = await prisma.task.findMany({
      where: { projectId: project.id },
      orderBy: { sequence: 'asc' },
    })
    expect(tasks[0].content).toBe('第一条要求')
    expect(tasks[7].pageNumber).toBe(1)
    expect(tasks[8].pageNumber).toBe(2)
  })

  it('rejects non-pdf extension', async () => {
    const result = await createProjectFromPdf(makeFile(await createSamplePdfBuffer(), 'a.txt'))
    expect(result).toEqual({ ok: false, status: 400, reason: '仅支持 .pdf 文件' })
    expect(await prisma.project.count()).toBe(0)
  })

  it('rejects wrong mime type', async () => {
    const result = await createProjectFromPdf(makeFile(await createSamplePdfBuffer(), 'a.pdf', 'text/plain'))
    expect(result).toEqual({ ok: false, status: 400, reason: '文件类型必须是 application/pdf' })
  })

  it('rejects empty file', async () => {
    const result = await createProjectFromPdf(makeFile(Buffer.alloc(0)))
    expect(result).toEqual({ ok: false, status: 400, reason: '文件内容为空' })
  })

  it('rejects file without pdf signature', async () => {
    const fake = Buffer.from('not a real pdf content at all')
    const result = await createProjectFromPdf(makeFile(fake))
    expect(result).toEqual({ ok: false, status: 400, reason: '文件不是有效的 PDF' })
    expect(await prisma.project.count()).toBe(0)
  })

  it('marks project FAILED for corrupt pdf with pdf signature', async () => {
    const corrupt = Buffer.from('%PDF-1.4 broken body without trailer')
    const result = await createProjectFromPdf(makeFile(corrupt))
    expect(result.ok).toBe(false)
    const project = await prisma.project.findFirstOrThrow()
    expect(project.status).toBe('FAILED')
    expect(project.parseError).toBeTruthy()
  })
})

describe('queries', () => {
  beforeEach(resetDb)

  it('listProjects returns newest first with lastSequence', async () => {
    const older = await createProjectFromPdf(makeFile(await createSamplePdfBuffer(), '旧.pdf'))
    const newer = await createProjectFromPdf(makeFile(await createSamplePdfBuffer(), '新.pdf'))
    if (!older.ok || !newer.ok) throw new Error('setup failed')
    const firstTask = await prisma.task.findFirstOrThrow({
      where: { projectId: older.projectId, sequence: 3 },
    })
    await prisma.project.update({ where: { id: older.projectId }, data: { lastTaskId: firstTask.id } })

    const list = await listProjects()
    expect(list).toHaveLength(2)
    expect(list[0].project.id).toBe(newer.projectId)
    expect(list[1].lastSequence).toBe(3)
  })

  it('getProjectSummary resolves first pending/deferred sequences', async () => {
    const created = await createProjectFromPdf(makeFile(await createSamplePdfBuffer()))
    if (!created.ok) throw new Error('setup failed')
    const t2 = await prisma.task.findFirstOrThrow({ where: { projectId: created.projectId, sequence: 2 } })
    const t5 = await prisma.task.findFirstOrThrow({ where: { projectId: created.projectId, sequence: 5 } })
    await prisma.task.update({ where: { id: t2.id }, data: { status: 'PASSED' } })
    await prisma.task.update({ where: { id: t5.id }, data: { status: 'DEFERRED', remark: '待定' } })

    const summary = await getProjectSummary(created.projectId)
    expect(summary).not.toBeNull()
    expect(summary!.firstPendingSequence).toBe(1)
    expect(summary!.firstDeferredSequence).toBe(5)
  })

  it('getTaskBySequence returns task or null', async () => {
    const created = await createProjectFromPdf(makeFile(await createSamplePdfBuffer()))
    if (!created.ok) throw new Error('setup failed')
    expect((await getTaskBySequence(created.projectId, 1))?.content).toBe('第一条要求')
    expect(await getTaskBySequence(created.projectId, 99)).toBeNull()
  })
})
