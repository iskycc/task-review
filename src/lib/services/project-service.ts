import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { PDF_MAX_SIZE_BYTES, PDF_MAX_SIZE_MB, UPLOAD_DIR, TASK_CREATE_BATCH_SIZE } from '@/lib/config'
import { extractLines } from '@/lib/pdf/extract-lines'

export type CreateProjectResult =
  | { ok: true; projectId: string; taskCount: number }
  | { ok: false; status: number; reason: string }

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d] // "%PDF-"

export async function createProjectFromPdf(file: File): Promise<CreateProjectResult> {
  // ---- Upload validation (no Project created) ----
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return { ok: false, status: 400, reason: '仅支持 .pdf 文件' }
  }
  if (file.type !== 'application/pdf') {
    return { ok: false, status: 400, reason: '文件类型必须是 application/pdf' }
  }
  if (file.size === 0) {
    return { ok: false, status: 400, reason: '文件内容为空' }
  }
  if (file.size > PDF_MAX_SIZE_BYTES) {
    return { ok: false, status: 400, reason: `文件大小超过 ${PDF_MAX_SIZE_MB} MB 限制` }
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.length < PDF_SIGNATURE.length || !PDF_SIGNATURE.every((b, i) => bytes[i] === b)) {
    return { ok: false, status: 400, reason: '文件不是有效的 PDF' }
  }

  // ---- Persist file + create PARSING Project ----
  await mkdir(UPLOAD_DIR, { recursive: true })
  const filePath = path.join(UPLOAD_DIR, `${randomUUID()}.pdf`)
  await writeFile(filePath, bytes)
  const name = file.name.replace(/\.pdf$/i, '').trim() || '未命名项目'
  const project = await prisma.project.create({
    data: {
      name,
      originalFileName: file.name,
      filePath,
      fileSize: file.size,
      status: 'PARSING',
    },
  })

  // ---- Synchronous parsing ----
  const fail = async (reason: string): Promise<CreateProjectResult> => {
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'FAILED', parseError: reason },
    })
    return { ok: false, status: 422, reason }
  }

  try {
    const lines = await extractLines(bytes)
    if (lines.length === 0) {
      return fail('未解析出有效文本，可能是扫描件或空白 PDF，当前版本暂不支持')
    }
    for (let i = 0; i < lines.length; i += TASK_CREATE_BATCH_SIZE) {
      const batch = lines.slice(i, i + TASK_CREATE_BATCH_SIZE)
      await prisma.task.createMany({
        data: batch.map((line, j) => ({
          projectId: project.id,
          sequence: i + j + 1,
          content: line.content,
          pageNumber: line.pageNumber,
          lineNumber: line.lineNumber,
        })),
      })
    }
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'READY', totalTasks: lines.length, pendingTasks: lines.length },
    })
    return { ok: true, projectId: project.id, taskCount: lines.length }
  } catch (error) {
    const errorName = (error as Error)?.name ?? ''
    if (errorName === 'PasswordException') {
      return fail('PDF 已加密，当前版本暂不支持加密文件')
    }
    console.error(`[project-service] PDF parse failed for project ${project.id}:`, error)
    return fail('PDF 解析失败，文件可能已损坏，请更换文件重试')
  }
}

// ---- Queries ----

export interface ProjectListItem {
  project: Prisma.ProjectGetPayload<object>
  lastSequence: number | null
}

export async function listProjects(): Promise<ProjectListItem[]> {
  const projects = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } })
  const lastTaskIds = projects.map((p) => p.lastTaskId).filter((id): id is string => id !== null)
  const lastTasks = await prisma.task.findMany({
    where: { id: { in: lastTaskIds } },
    select: { id: true, sequence: true },
  })
  const sequenceByTaskId = new Map(lastTasks.map((t) => [t.id, t.sequence]))
  return projects.map((project) => ({
    project,
    lastSequence: project.lastTaskId ? sequenceByTaskId.get(project.lastTaskId) ?? null : null,
  }))
}

export interface ProjectSummary {
  project: Prisma.ProjectGetPayload<object>
  lastSequence: number | null
  firstPendingSequence: number | null
  firstDeferredSequence: number | null
}

export async function getProjectSummary(projectId: string): Promise<ProjectSummary | null> {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return null

  let lastSequence: number | null = null
  if (project.lastTaskId) {
    const lastTask = await prisma.task.findUnique({
      where: { id: project.lastTaskId },
      select: { sequence: true },
    })
    lastSequence = lastTask?.sequence ?? null
  }

  const firstPending = await prisma.task.findFirst({
    where: { projectId, status: 'PENDING' },
    orderBy: { sequence: 'asc' },
    select: { sequence: true },
  })
  const firstDeferred = await prisma.task.findFirst({
    where: { projectId, status: 'DEFERRED' },
    orderBy: { sequence: 'asc' },
    select: { sequence: true },
  })
  return {
    project,
    lastSequence,
    firstPendingSequence: firstPending?.sequence ?? null,
    firstDeferredSequence: firstDeferred?.sequence ?? null,
  }
}

export async function getTaskBySequence(projectId: string, sequence: number) {
  return prisma.task.findFirst({ where: { projectId, sequence } })
}

export async function getFirstTaskByStatus(projectId: string, status: string) {
  return prisma.task.findFirst({
    where: { projectId, status },
    orderBy: { sequence: 'asc' },
  })
}
