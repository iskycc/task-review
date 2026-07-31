import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from './helpers/db'
import { createProjectWithTasks } from './helpers/db'
import { createSamplePdfBuffer } from './helpers/sample-pdf'
import { makeEmptyUploadRequest, makeJsonRequest, makeUploadRequest } from './helpers/next-request'
import { POST, GET } from '@/app/api/projects/route'

describe('POST /api/projects', () => {
  beforeEach(resetDb)

  it('creates project and returns task count', async () => {
    const file = new File([new Uint8Array(await createSamplePdfBuffer())], '需求.pdf', { type: 'application/pdf' })
    const res = await POST(makeUploadRequest('/api/projects', file))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.taskCount).toBe(20)
    expect(body.projectId).toBeTruthy()
  })

  it('rejects when file missing', async () => {
    const res = await POST(makeEmptyUploadRequest('/api/projects'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('请选择要上传的 PDF 文件')
  })

  it('rejects invalid file with readable reason', async () => {
    const file = new File([new Uint8Array(Buffer.from('hello'))], 'a.pdf', { type: 'application/pdf' })
    const res = await POST(makeUploadRequest('/api/projects', file))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('文件不是有效的 PDF')
  })
})

describe('GET /api/projects', () => {
  beforeEach(resetDb)

  it('returns projects newest first', async () => {
    await createProjectWithTasks(['一'], { name: '项目A' })
    await createProjectWithTasks(['二'], { name: '项目B' })
    const res = await GET(makeJsonRequest('/api/projects', 'GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.projects).toHaveLength(2)
    expect(body.projects[0].name).toBe('项目B')
    expect(body.projects[0].totalTasks).toBe(1)
  })
})
