# PDF Task Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 PRD.md 实现 PDF Task Review MVP：上传 PDF → 生成 Project/Task → 逐条审核 → 结果汇总。

**Architecture:** Next.js App Router（页面）+ Route Handlers（REST API）+ 服务层（`src/lib/services`）+ Prisma/SQLite。PDF 解析用 unpdf（pdfjs-dist 的 Node 封装，按文本块坐标重建视觉行），同步解析。页面服务端组件直接用服务层取数，客户端交互走 API。

**Tech Stack:** Next.js 15 + React 19 + TypeScript, Prisma 6 + SQLite, unpdf (pdfjs-dist), Tailwind CSS 4, Vitest 3, pdfkit（测试 fixture）。

**Spec:** `docs/superpowers/specs/2026-07-29-pdf-task-review-design.md`（已批准）

**Conventions:**
- 所有源码在 `src/`，路径别名 `@/*` → `src/*`
- 测试在 `tests/`，Vitest node 环境，测试库 `prisma/test.db`（由 global-setup 自动 `db push`）
- 用户可见文案用中文；代码、标识符、commit message 用英文（conventional commits）
- 状态值：Project `PARSING|FAILED|READY|REVIEWING|COMPLETED`；Task `PENDING|PASSED|DEFERRED`

---

### Task 1: 项目脚手架

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`, `.env`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`（占位，Task 10 替换）
- Create: `vitest.config.ts`

- [ ] **Step 1: 写 package.json**

```json
{
  "name": "pdf-task-review",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:push": "prisma db push",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^6.5.0",
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "unpdf": "^1.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^20.0.0",
    "@types/pdfkit": "^0.13.8",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "pdfkit": "^0.15.0",
    "prisma": "^6.5.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

注：若某版本安装时报 404，改用 `npm install <pkg>@latest` 取最新兼容版本。

- [ ] **Step 2: 写 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: 写 next.config.ts**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['unpdf', 'pdfjs-dist'],
}

export default nextConfig
```

- [ ] **Step 4: 写 postcss.config.mjs**

```js
export default {
  plugins: { '@tailwindcss/postcss': {} },
}
```

- [ ] **Step 5: 写 .gitignore 与 .env**

`.gitignore`：
```
node_modules/
.next/
*.tsbuildinfo
next-env.d.ts
data/
prisma/*.db
prisma/*.db-journal
```

`.env`：
```
DATABASE_URL="file:./dev.db"
```

- [ ] **Step 6: 写 src/app/globals.css**

```css
@import "tailwindcss";

body {
  @apply bg-gray-50 text-gray-900 antialiased;
}
```

- [ ] **Step 7: 写 src/app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PDF Task Review',
  description: '将 PDF 内容转换为待审核任务',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 8: 写占位 src/app/page.tsx（Task 10 会替换）**

```tsx
export default function Home() {
  return <main className="p-8">PDF Task Review</main>
}
```

- [ ] **Step 9: 写 vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    fileParallelism: false,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
```

- [ ] **Step 10: 安装依赖并验证构建**

Run:
```bash
npm install
npm run build
```
Expected: install 成功；build 成功输出 `✓ Compiled successfully`（首页为占位页）。

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs .gitignore .env.example src vitest.config.ts
git commit -m "chore: scaffold Next.js project with Tailwind and Vitest"
```
注意：`.env` 不入库；先 `cp .env .env.example` 再提交。

---

### Task 2: Prisma schema 与数据库客户端

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Create: `tests/global-setup.ts`, `tests/setup.ts`, `tests/helpers/db.ts`
- Test: `tests/db.test.ts`

- [ ] **Step 1: 写 prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Project {
  id               String   @id @default(cuid())
  name             String
  originalFileName String
  filePath         String
  fileSize         Int
  status           String   @default("PARSING")
  parseError       String?
  totalTasks       Int      @default(0)
  passedTasks      Int      @default(0)
  deferredTasks    Int      @default(0)
  pendingTasks     Int      @default(0)
  lastTaskId       String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  tasks            Task[]
}

model Task {
  id         String    @id @default(cuid())
  projectId  String
  project    Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sequence   Int
  content    String
  pageNumber Int?
  lineNumber Int?
  status     String    @default("PENDING")
  remark     String?
  reviewedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@unique([projectId, sequence])
  @@index([projectId, status])
}
```

注：SQLite 不支持 Prisma enum，状态用 String + 应用层常量约束。

- [ ] **Step 2: 生成 client 并建开发库**

Run:
```bash
npx prisma generate
npx prisma db push
```
Expected: `Generated Prisma Client`；创建 `prisma/dev.db`。

- [ ] **Step 3: 写 src/lib/db.ts**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 4: 写 tests/global-setup.ts（测试库初始化）**

```ts
import { execSync } from 'node:child_process'

export default function setup() {
  execSync('npx prisma db push --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  })
}
```

- [ ] **Step 5: 写 tests/setup.ts**

```ts
process.env.DATABASE_URL = 'file:./test.db'
```

- [ ] **Step 6: 写 tests/helpers/db.ts（建/清数据工具）**

```ts
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
```

- [ ] **Step 7: 写失败测试 tests/db.test.ts**

```ts
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
```

- [ ] **Step 8: 运行测试确认通过**

Run: `npm test`
Expected: `tests/db.test.ts` 1 passed（global-setup 自动创建 `prisma/test.db`）。

- [ ] **Step 9: Commit**

```bash
git add prisma src/lib/db.ts tests
git commit -m "feat: add Prisma schema, db client and test harness"
```

---

### Task 3: 配置与共享校验

**Files:**
- Create: `src/lib/config.ts`
- Create: `src/lib/validation.ts`
- Test: `tests/validation.test.ts`

- [ ] **Step 1: 写失败测试 tests/validation.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { validateReviewInput } from '@/lib/validation'

describe('validateReviewInput', () => {
  it('rejects unknown status', () => {
    expect(validateReviewInput({ status: 'SKIP' })).toBe('无效的审核状态')
  })

  it('accepts PASSED without remark', () => {
    expect(validateReviewInput({ status: 'PASSED' })).toBeNull()
  })

  it('rejects DEFERRED with empty remark', () => {
    expect(validateReviewInput({ status: 'DEFERRED', remark: '   ' })).toBe('暂时遗留必须填写备注')
    expect(validateReviewInput({ status: 'DEFERRED' })).toBe('暂时遗留必须填写备注')
  })

  it('rejects remark over 2000 chars', () => {
    expect(validateReviewInput({ status: 'PASSED', remark: 'a'.repeat(2001) })).toBe('备注不能超过 2000 个字符')
  })

  it('accepts DEFERRED with valid remark', () => {
    expect(validateReviewInput({ status: 'DEFERRED', remark: '稍后确认' })).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/validation.test.ts`
Expected: FAIL（`@/lib/validation` 不存在）。

- [ ] **Step 3: 写 src/lib/config.ts**

```ts
export const PDF_MAX_SIZE_MB = Number(process.env.PDF_MAX_SIZE_MB ?? 20)
export const PDF_MAX_SIZE_BYTES = PDF_MAX_SIZE_MB * 1024 * 1024
export const REMARK_MAX_LENGTH = 2000
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'data/uploads'
export const TASK_CREATE_BATCH_SIZE = 500
```

- [ ] **Step 4: 写 src/lib/validation.ts**

```ts
import { REMARK_MAX_LENGTH } from './config'

export type ReviewStatus = 'PASSED' | 'DEFERRED'

export interface ReviewInput {
  status: string
  remark?: string
}

/** 返回错误文案；通过时返回 null。 */
export function validateReviewInput(input: ReviewInput): string | null {
  if (input.status !== 'PASSED' && input.status !== 'DEFERRED') {
    return '无效的审核状态'
  }
  if (input.remark !== undefined && input.remark.length > REMARK_MAX_LENGTH) {
    return '备注不能超过 2000 个字符'
  }
  if (input.status === 'DEFERRED') {
    if (input.remark === undefined || input.remark.trim().length === 0) {
      return '暂时遗留必须填写备注'
    }
  }
  return null
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- tests/validation.test.ts`
Expected: 5 passed。

- [ ] **Step 6: Commit**

```bash
git add src/lib/config.ts src/lib/validation.ts tests/validation.test.ts
git commit -m "feat: add config and review input validation"
```

---

### Task 4: PDF 行提取（unpdf / pdfjs 坐标重建视觉行）

**Files:**
- Create: `src/lib/pdf/extract-lines.ts`
- Create: `tests/helpers/sample-pdf.ts`（用 pdfkit 内存生成样例 PDF）
- Test: `tests/extract-lines.test.ts`

- [ ] **Step 1: 写 tests/helpers/sample-pdf.ts**

```ts
import PDFDocument from 'pdfkit'

/** 生成 3 页共 20 行可复制文本的 PDF（含两行相同文本）。 */
export function createSamplePdfBuffer(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pages: string[][] = [
      ['第一条要求', '第二条要求', '重复条款内容', '第四条要求', '第五条要求', '第六条要求', '第七条要求', '第八条要求'],
      ['第九条要求', '重复条款内容', '第十一条要求', '第十二条要求', '第十三条要求', '第十四条要求', '第十五条要求'],
      ['第十六条要求', '第十七条要求', '第十八条要求', '第十九条要求', '第二十条要求'],
    ]
    for (const lines of pages) {
      doc.addPage()
      doc.fontSize(12)
      for (const line of lines) doc.text(line)
    }
    doc.end()
  })
}
```

- [ ] **Step 2: 写失败测试 tests/extract-lines.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { groupItemsIntoLines, extractLines } from '@/lib/pdf/extract-lines'
import { createSamplePdfBuffer } from './helpers/sample-pdf'

describe('groupItemsIntoLines', () => {
  it('groups items by y with tolerance, orders by y desc then x asc', () => {
    const items = [
      { str: '右', x: 100, y: 700 },
      { str: '左', x: 50, y: 701 },   // 与上一行同一视觉行（容差内）
      { str: '下行', x: 50, y: 680 },
    ]
    expect(groupItemsIntoLines(items)).toEqual(['左右', '下行'])
  })

  it('keeps items in reading order within a line', () => {
    const items = [
      { str: 'world', x: 60, y: 100 },
      { str: 'hello ', x: 10, y: 100 },
    ]
    expect(groupItemsIntoLines(items)).toEqual(['hello world'])
  })
})

describe('extractLines', () => {
  it('extracts 20 ordered lines from a 3-page pdf with page and line numbers', async () => {
    const buffer = await createSamplePdfBuffer()
    const lines = await extractLines(new Uint8Array(buffer))
    expect(lines).toHaveLength(20)
    expect(lines[0]).toEqual({ content: '第一条要求', pageNumber: 1, lineNumber: 1 })
    expect(lines[2].content).toBe('重复条款内容')
    expect(lines[8].pageNumber).toBe(2)
    expect(lines[9].content).toBe('重复条款内容') // 相同文本不去重
    expect(lines[8].lineNumber).toBe(1)          // 页内行号每页重新计数
    expect(lines[19]).toEqual({ content: '第二十条要求', pageNumber: 3, lineNumber: 5 })
  })

  it('trims leading/trailing whitespace and drops blank lines', async () => {
    const lines = await extractLines(
      new Uint8Array(await createSamplePdfBuffer()),
    )
    for (const line of lines) {
      expect(line.content).toBe(line.content.trim())
      expect(line.content.length).toBeGreaterThan(0)
    }
  })

  it('rejects on a corrupt pdf', async () => {
    await expect(extractLines(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow()
  })
})
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npm test -- tests/extract-lines.test.ts`
Expected: FAIL（`@/lib/pdf/extract-lines` 不存在）。

- [ ] **Step 4: 写 src/lib/pdf/extract-lines.ts**

```ts
import { getDocumentProxy } from 'unpdf'

export interface PdfTextItem {
  str: string
  x: number
  y: number
}

export interface ExtractedLine {
  content: string
  pageNumber: number
  lineNumber: number
}

/**
 * 按 y 坐标（容差聚类）把文本块还原为视觉行：
 * 先按 y 降序（PDF 原点在左下角，y 越大越靠上）、x 升序排序，
 * 与上一行 y 差在容差内视为同一行，行内按 x 拼接。
 */
export function groupItemsIntoLines(items: PdfTextItem[], yTolerance = 3): string[] {
  const sorted = [...items]
    .filter((item) => item.str.length > 0)
    .sort((a, b) => b.y - a.y || a.x - b.x)

  const lines: { y: number; parts: PdfTextItem[] }[] = []
  for (const item of sorted) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(last.y - item.y) <= yTolerance) {
      last.parts.push(item)
    } else {
      lines.push({ y: item.y, parts: [item] })
    }
  }
  return lines.map((line) =>
    line.parts
      .sort((a, b) => a.x - b.x)
      .map((part) => part.str)
      .join(''),
  )
}

/** 逐页提取有效文本行：去首尾空白、跳过空白行、不去重。 */
export async function extractLines(pdfData: Uint8Array): Promise<ExtractedLine[]> {
  const pdf = await getDocumentProxy(pdfData)
  try {
    const result: ExtractedLine[] = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const items: PdfTextItem[] = []
      for (const item of textContent.items) {
        if (!('str' in item)) continue
        items.push({ str: item.str, x: item.transform[4], y: item.transform[5] })
      }
      let lineNumber = 0
      for (const raw of groupItemsIntoLines(items)) {
        const content = raw.trim()
        if (!content) continue
        lineNumber += 1
        result.push({ content, pageNumber, lineNumber })
      }
    }
    return result
  } finally {
    await pdf.destroy()
  }
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- tests/extract-lines.test.ts`
Expected: 5 passed。若样例 PDF 行数与预期不符，打印 `lines` 检查 pdfkit 的实际分页/换行行为后修正 fixture（保持 3 页 20 行的验收目标）。

- [ ] **Step 6: Commit**

```bash
git add src/lib/pdf tests/helpers/sample-pdf.ts tests/extract-lines.test.ts
git commit -m "feat: extract visual text lines from PDF via unpdf coordinates"
```

---

### Task 5: Project 服务（上传校验 + 同步解析 + 查询）

**Files:**
- Create: `src/lib/services/project-service.ts`
- Test: `tests/project-service.test.ts`

- [ ] **Step 1: 写失败测试 tests/project-service.test.ts**

```ts
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
  return new File([buffer], name, { type })
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/project-service.test.ts`
Expected: FAIL（`@/lib/services/project-service` 不存在）。

- [ ] **Step 3: 写 src/lib/services/project-service.ts**

```ts
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
  // ---- 上传校验（不创建 Project）----
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

  // ---- 落盘 + 创建 PARSING Project ----
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

  // ---- 同步解析 ----
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
    console.error(`[project-service] PDF parse failed for project ${project.id}:`, errorName || error)
    return fail('PDF 解析失败，文件可能已损坏，请更换文件重试')
  }
}

// ---- 查询 ----

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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/project-service.test.ts`
Expected: 全部通过。注意：测试会写 `data/uploads/`（已 gitignore）。

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/project-service.ts tests/project-service.test.ts
git commit -m "feat: add project service with upload validation and sync parsing"
```

---

### Task 6: Review 服务（事务审核更新 + 停留位置）

**Files:**
- Create: `src/lib/services/review-service.ts`
- Test: `tests/review-service.test.ts`

- [ ] **Step 1: 写失败测试 tests/review-service.test.ts**

```ts
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
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).lastTaskId).toBe(task.id)
  })

  it('rejects task from another project', async () => {
    const p1 = await createProjectWithTasks(['一'])
    const p2 = await createProjectWithTasks(['二'])
    const task = await prisma.task.findFirstOrThrow({ where: { projectId: p1.id, sequence: 1 } })
    await expect(updateLastPosition(p2.id, task.id)).rejects.toThrow(ServiceError)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/review-service.test.ts`
Expected: FAIL（`@/lib/services/review-service` 不存在）。

- [ ] **Step 3: 写 src/lib/services/review-service.ts**

```ts
import { prisma } from '@/lib/db'
import { validateReviewInput } from '@/lib/validation'

export class ServiceError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message)
    this.name = 'ServiceError'
  }
}

export function deriveProjectStatus(counts: { total: number; pending: number }): string {
  if (counts.pending === 0 && counts.total > 0) return 'COMPLETED'
  if (counts.pending === counts.total) return 'READY'
  return 'REVIEWING'
}

export interface UpdateReviewInput {
  projectId: string
  taskId: string
  status: string
  /** 传入则覆盖备注；不传则保留历史备注 */
  remark?: string
}

export async function updateTaskReview(input: UpdateReviewInput) {
  const validationError = validateReviewInput({ status: input.status, remark: input.remark })
  if (validationError) throw new ServiceError(validationError)

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirst({ where: { id: input.taskId, projectId: input.projectId } })
    if (!task) throw new ServiceError('任务不存在', 404)

    // 暂留但未新填备注时，校验历史备注仍有效（例如从已通过改为暂留必须带新备注，
    // 而已暂留任务重新暂留可沿用原备注——此处校验的是最终生效值）。
    if (input.status === 'DEFERRED') {
      const effectiveRemark = input.remark !== undefined ? input.remark : task.remark ?? ''
      if (effectiveRemark.trim().length === 0) {
        throw new ServiceError('暂时遗留必须填写备注')
      }
    }

    const updatedTask = await tx.task.update({
      where: { id: task.id },
      data: {
        status: input.status,
        ...(input.remark !== undefined ? { remark: input.remark === '' ? null : input.remark } : {}),
        reviewedAt: new Date(),
      },
    })

    const grouped = await tx.task.groupBy({
      by: ['status'],
      where: { projectId: input.projectId },
      _count: { _all: true },
    })
    const countOf = (status: string) =>
      grouped.find((g) => g.status === status)?._count._all ?? 0
    const passed = countOf('PASSED')
    const deferred = countOf('DEFERRED')
    const pending = countOf('PENDING')
    const total = passed + deferred + pending

    const project = await tx.project.update({
      where: { id: input.projectId },
      data: {
        passedTasks: passed,
        deferredTasks: deferred,
        pendingTasks: pending,
        totalTasks: total,
        status: deriveProjectStatus({ total, pending }),
      },
    })

    return { task: updatedTask, project }
  })
}

export async function updateLastPosition(projectId: string, taskId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, projectId } })
  if (!task) throw new ServiceError('任务不存在', 404)
  await prisma.project.update({ where: { id: projectId }, data: { lastTaskId: taskId } })
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/review-service.test.ts`
Expected: 全部通过。

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/review-service.ts tests/review-service.test.ts
git commit -m "feat: add transactional review service with counters and status derivation"
```

---

### Task 7: API — Projects 上传与列表

**Files:**
- Create: `src/app/api/projects/route.ts`
- Create: `tests/helpers/next-request.ts`
- Test: `tests/api-projects.test.ts`

- [ ] **Step 1: 写 tests/helpers/next-request.ts**

```ts
import { NextRequest } from 'next/server'

export function makeJsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
  })
}

export function makeUploadRequest(url: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return new NextRequest(`http://localhost${url}`, { method: 'POST', body: formData })
}
```

- [ ] **Step 2: 写失败测试 tests/api-projects.test.ts**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb } from './helpers/db'
import { createProjectWithTasks } from './helpers/db'
import { createSamplePdfBuffer } from './helpers/sample-pdf'
import { makeUploadRequest } from './helpers/next-request'
import { POST, GET } from '@/app/api/projects/route'

describe('POST /api/projects', () => {
  beforeEach(resetDb)

  it('creates project and returns task count', async () => {
    const file = new File([await createSamplePdfBuffer()], '需求.pdf', { type: 'application/pdf' })
    const res = await POST(makeUploadRequest('/api/projects', file))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.taskCount).toBe(20)
    expect(body.projectId).toBeTruthy()
  })

  it('rejects when file missing', async () => {
    const formData = new FormData()
    const { NextRequest } = await import('next/server')
    const res = await POST(new NextRequest('http://localhost/api/projects', { method: 'POST', body: formData }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('请选择要上传的 PDF 文件')
  })

  it('rejects invalid file with readable reason', async () => {
    const file = new File([Buffer.from('hello')], 'a.pdf', { type: 'application/pdf' })
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
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.projects).toHaveLength(2)
    expect(body.projects[0].name).toBe('项目B')
    expect(body.projects[0].totalTasks).toBe(1)
  })
})
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npm test -- tests/api-projects.test.ts`
Expected: FAIL（route 不存在）。

- [ ] **Step 4: 写 src/app/api/projects/route.ts**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createProjectFromPdf, listProjects } from '@/lib/services/project-service'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '请选择要上传的 PDF 文件' }, { status: 400 })
  }
  const result = await createProjectFromPdf(file)
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: result.status })
  }
  return NextResponse.json(
    { projectId: result.projectId, taskCount: result.taskCount },
    { status: 201 },
  )
}

export async function GET() {
  const items = await listProjects()
  return NextResponse.json({
    projects: items.map(({ project, lastSequence }) => ({
      id: project.id,
      name: project.name,
      originalFileName: project.originalFileName,
      status: project.status,
      parseError: project.parseError,
      totalTasks: project.totalTasks,
      passedTasks: project.passedTasks,
      deferredTasks: project.deferredTasks,
      pendingTasks: project.pendingTasks,
      lastSequence,
      createdAt: project.createdAt,
    })),
  })
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- tests/api-projects.test.ts`
Expected: 4 passed。

- [ ] **Step 6: Commit**

```bash
git add src/app/api/projects tests/helpers/next-request.ts tests/api-projects.test.ts
git commit -m "feat: add projects upload and list API"
```

---

### Task 8: API — Project 详情与 Task 查询

**Files:**
- Create: `src/app/api/projects/[projectId]/route.ts`
- Create: `src/app/api/projects/[projectId]/tasks/route.ts`
- Create: `src/app/api/projects/[projectId]/tasks/[sequence]/route.ts`
- Test: `tests/api-tasks.test.ts`

- [ ] **Step 1: 写失败测试 tests/api-tasks.test.ts**

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/api-tasks.test.ts`
Expected: FAIL（routes 不存在）。

- [ ] **Step 3: 写 src/app/api/projects/[projectId]/route.ts**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getProjectSummary } from '@/lib/services/project-service'

export const runtime = 'nodejs'

type Params = { params: Promise<{ projectId: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { projectId } = await params
  const summary = await getProjectSummary(projectId)
  if (!summary) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 })
  }
  const { project } = summary
  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      originalFileName: project.originalFileName,
      status: project.status,
      parseError: project.parseError,
      totalTasks: project.totalTasks,
      passedTasks: project.passedTasks,
      deferredTasks: project.deferredTasks,
      pendingTasks: project.pendingTasks,
      createdAt: project.createdAt,
    },
    lastSequence: summary.lastSequence,
    firstPendingSequence: summary.firstPendingSequence,
    firstDeferredSequence: summary.firstDeferredSequence,
  })
}
```

- [ ] **Step 4: 写 src/app/api/projects/[projectId]/tasks/[sequence]/route.ts**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTaskBySequence } from '@/lib/services/project-service'

export const runtime = 'nodejs'

type Params = { params: Promise<{ projectId: string; sequence: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { projectId, sequence } = await params
  const seq = Number(sequence)
  if (!Number.isInteger(seq) || seq < 1) {
    return NextResponse.json({ error: '无效的任务序号' }, { status: 400 })
  }
  const task = await getTaskBySequence(projectId, seq)
  if (!task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 })
  }
  const totalTasks = await prisma.task.count({ where: { projectId } })
  return NextResponse.json({
    task: {
      id: task.id,
      sequence: task.sequence,
      content: task.content,
      pageNumber: task.pageNumber,
      lineNumber: task.lineNumber,
      status: task.status,
      remark: task.remark,
    },
    totalTasks,
  })
}
```

- [ ] **Step 5: 写 src/app/api/projects/[projectId]/tasks/route.ts**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getFirstTaskByStatus } from '@/lib/services/project-service'

export const runtime = 'nodejs'

const VALID_STATUSES = new Set(['PENDING', 'PASSED', 'DEFERRED'])

type Params = { params: Promise<{ projectId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { projectId } = await params
  const status = request.nextUrl.searchParams.get('status')
  if (!status || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: '无效的状态筛选' }, { status: 400 })
  }
  const task = await getFirstTaskByStatus(projectId, status)
  return NextResponse.json({
    task: task ? { id: task.id, sequence: task.sequence, status: task.status } : null,
  })
}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npm test -- tests/api-tasks.test.ts`
Expected: 7 passed。

- [ ] **Step 7: Commit**

```bash
git add "src/app/api/projects/[projectId]" tests/api-tasks.test.ts
git commit -m "feat: add project detail and task query APIs"
```

---

### Task 9: API — Review 更新与停留位置

**Files:**
- Create: `src/app/api/tasks/[taskId]/review/route.ts`
- Create: `src/app/api/projects/[projectId]/progress/route.ts`
- Test: `tests/api-review.test.ts`

- [ ] **Step 1: 写失败测试 tests/api-review.test.ts**

```ts
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
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).lastTaskId).toBe(tasks[1].id)
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/api-review.test.ts`
Expected: FAIL（routes 不存在）。

- [ ] **Step 3: 写 src/app/api/tasks/[taskId]/review/route.ts**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { updateTaskReview, ServiceError } from '@/lib/services/review-service'

export const runtime = 'nodejs'

type Params = { params: Promise<{ taskId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { taskId } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body.projectId !== 'string' || typeof body.status !== 'string') {
    return NextResponse.json({ error: '请求参数不完整' }, { status: 400 })
  }
  try {
    const result = await updateTaskReview({
      projectId: body.projectId,
      taskId,
      status: body.status,
      remark: typeof body.remark === 'string' ? body.remark : undefined,
    })
    return NextResponse.json({
      task: {
        id: result.task.id,
        sequence: result.task.sequence,
        status: result.task.status,
        remark: result.task.remark,
      },
      project: {
        status: result.project.status,
        totalTasks: result.project.totalTasks,
        passedTasks: result.project.passedTasks,
        deferredTasks: result.project.deferredTasks,
        pendingTasks: result.project.pendingTasks,
      },
    })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[review] unexpected error:', error)
    return NextResponse.json({ error: '保存失败，请重试' }, { status: 500 })
  }
}
```

- [ ] **Step 4: 写 src/app/api/projects/[projectId]/progress/route.ts**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { updateLastPosition, ServiceError } from '@/lib/services/review-service'

export const runtime = 'nodejs'

type Params = { params: Promise<{ projectId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { projectId } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body.taskId !== 'string') {
    return NextResponse.json({ error: '请求参数不完整' }, { status: 400 })
  }
  try {
    await updateLastPosition(projectId, body.taskId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[progress] unexpected error:', error)
    return NextResponse.json({ error: '保存失败' }, { status: 500 })
  }
}
```

- [ ] **Step 5: 运行全部测试确认通过**

Run: `npm test`
Expected: 全部测试通过（db、validation、extract-lines、project-service、review-service、api-projects、api-tasks、api-review）。

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/tasks" "src/app/api/projects/[projectId]/progress" tests/api-review.test.ts
git commit -m "feat: add review update and progress APIs"
```

---

### Task 10: Project 列表页与上传组件

**Files:**
- Create: `src/components/UploadButton.tsx`
- Create: `src/components/ProjectCard.tsx`
- Create: `src/components/ProjectStatusBadge.tsx`
- Modify: `src/app/page.tsx`（替换占位）

- [ ] **Step 1: 写 src/components/ProjectStatusBadge.tsx**

```tsx
const STATUS_TEXT: Record<string, { label: string; className: string }> = {
  PARSING: { label: '解析中', className: 'bg-blue-100 text-blue-800' },
  FAILED: { label: '导入失败', className: 'bg-red-100 text-red-800' },
  READY: { label: '待审核', className: 'bg-gray-200 text-gray-800' },
  REVIEWING: { label: '审核中', className: 'bg-amber-100 text-amber-800' },
  COMPLETED: { label: '已完成', className: 'bg-green-100 text-green-800' },
}

export function ProjectStatusBadge({ status }: { status: string }) {
  const info = STATUS_TEXT[status] ?? { label: status, className: 'bg-gray-200 text-gray-800' }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${info.className}`}>
      {info.label}
    </span>
  )
}
```

- [ ] **Step 2: 写 src/components/UploadButton.tsx**

```tsx
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type UploadState =
  | { phase: 'idle' }
  | { phase: 'busy'; message: string }
  | { phase: 'success'; taskCount: number }
  | { phase: 'error'; message: string }

export function UploadButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [state, setState] = useState<UploadState>({ phase: 'idle' })
  const busy = state.phase === 'busy'

  const upload = async (file: File) => {
    setState({ phase: 'busy', message: '正在上传并解析 PDF…' })
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/projects', { method: 'POST', body: formData })
      const body = await res.json()
      if (!res.ok) {
        setState({ phase: 'error', message: body.error ?? '上传失败，请重试' })
        return
      }
      setState({ phase: 'success', taskCount: body.taskCount })
      router.refresh()
    } catch {
      setState({ phase: 'error', message: '网络异常，上传失败，请重试' })
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {busy ? '上传中…' : '上传 PDF'}
      </button>
      <div aria-live="polite" className="mt-2 text-sm">
        {state.phase === 'busy' && <p className="text-gray-600">{state.message}</p>}
        {state.phase === 'success' && (
          <p className="text-green-700">导入成功，已创建 {state.taskCount} 条任务。</p>
        )}
        {state.phase === 'error' && <p className="text-red-700">{state.message}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 写 src/components/ProjectCard.tsx**

```tsx
import Link from 'next/link'
import { ProjectStatusBadge } from './ProjectStatusBadge'

export interface ProjectCardData {
  id: string
  name: string
  originalFileName: string
  status: string
  parseError: string | null
  totalTasks: number
  passedTasks: number
  deferredTasks: number
  pendingTasks: number
  createdAt: Date
  lastSequence: number | null
}

export function ProjectCard({ data }: { data: ProjectCardData }) {
  const processed = data.passedTasks + data.deferredTasks
  const percent = data.totalTasks > 0 ? Math.round((processed / data.totalTasks) * 100) : 0

  let entry: React.ReactNode = null
  if (data.status === 'READY' || data.status === 'REVIEWING') {
    const label = data.status === 'READY' ? '开始审核' : '继续审核'
    const seq = data.lastSequence ?? 1
    entry = (
      <Link
        href={`/projects/${data.id}/review/${seq}`}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {label}
      </Link>
    )
  } else if (data.status === 'COMPLETED') {
    entry = (
      <Link
        href={`/projects/${data.id}/result`}
        className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-white hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700"
      >
        查看结果
      </Link>
    )
  }

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{data.name}</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {data.originalFileName} · {data.createdAt.toLocaleString('zh-CN')}
          </p>
        </div>
        <ProjectStatusBadge status={data.status} />
      </div>

      {data.status === 'PARSING' && <p className="mt-3 text-sm text-gray-600">正在解析 PDF 并创建任务…</p>}
      {data.status === 'FAILED' && (
        <p className="mt-3 text-sm text-red-700">导入失败：{data.parseError ?? '未知原因'}</p>
      )}

      {data.totalTasks > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>
              共 {data.totalTasks} 条 · 已通过 {data.passedTasks} · 暂留 {data.deferredTasks} · 待处理{' '}
              {data.pendingTasks}
            </span>
            <span>{percent}%</span>
          </div>
          <div
            className="mt-1 h-2 w-full rounded-full bg-gray-200"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`审核进度 ${percent}%`}
          >
            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {entry && <div className="mt-4">{entry}</div>}
    </li>
  )
}
```

- [ ] **Step 4: 替换 src/app/page.tsx**

```tsx
import { listProjects } from '@/lib/services/project-service'
import { UploadButton } from '@/components/UploadButton'
import { ProjectCard } from '@/components/ProjectCard'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const items = await listProjects()

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PDF Task Review</h1>
        <UploadButton />
      </div>

      {items.length === 0 ? (
        <div className="mt-16 rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          <p>还没有审核项目。</p>
          <p className="mt-1">点击右上角“上传 PDF”创建第一个 Project。</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map(({ project, lastSequence }) => (
            <ProjectCard
              key={project.id}
              data={{
                id: project.id,
                name: project.name,
                originalFileName: project.originalFileName,
                status: project.status,
                parseError: project.parseError,
                totalTasks: project.totalTasks,
                passedTasks: project.passedTasks,
                deferredTasks: project.deferredTasks,
                pendingTasks: project.pendingTasks,
                createdAt: project.createdAt,
                lastSequence,
              }}
            />
          ))}
        </ul>
      )}
    </main>
  )
}
```

- [ ] **Step 5: 验证构建与手动冒烟**

Run:
```bash
npm run build
npm test
```
Expected: build 成功，测试全绿。随后 `npm run dev` 打开首页确认渲染（可在 Task 13 统一做端到端冒烟）。

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/components
git commit -m "feat: add project list page with upload UI"
```

---

### Task 11: Task Review 页面

**Files:**
- Create: `src/app/projects/[projectId]/review/[sequence]/page.tsx`
- Create: `src/components/ReviewClient.tsx`
- Create: `src/components/TaskStatusBadge.tsx`

- [ ] **Step 1: 写 src/components/TaskStatusBadge.tsx**

```tsx
const TASK_STATUS_TEXT: Record<string, { label: string; className: string }> = {
  PENDING: { label: '待处理', className: 'bg-gray-200 text-gray-800' },
  PASSED: { label: '已通过', className: 'bg-green-100 text-green-800' },
  DEFERRED: { label: '暂时遗留', className: 'bg-amber-100 text-amber-800' },
}

export function TaskStatusBadge({ status }: { status: string }) {
  const info = TASK_STATUS_TEXT[status] ?? { label: status, className: 'bg-gray-200 text-gray-800' }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${info.className}`}>
      {info.label}
    </span>
  )
}
```

- [ ] **Step 2: 写 Review 服务端页面 src/app/projects/[projectId]/review/[sequence]/page.tsx**

```tsx
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getProjectSummary, getTaskBySequence } from '@/lib/services/project-service'
import { ReviewClient } from '@/components/ReviewClient'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ projectId: string; sequence: string }> }

export default async function ReviewPage({ params }: Params) {
  const { projectId, sequence } = await params
  const seq = Number(sequence)

  const summary = await getProjectSummary(projectId)
  if (!summary) notFound()
  const { project } = summary

  if (project.status === 'PARSING') {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-gray-700">项目正在解析中，请稍后在项目列表重新进入。</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">返回项目列表</Link>
      </main>
    )
  }
  if (project.status === 'FAILED' || project.totalTasks === 0) {
    redirect('/')
  }

  // 序号越界 → 返回有效位置（最后停留或第一条）
  if (!Number.isInteger(seq) || seq < 1 || seq > project.totalTasks) {
    redirect(`/projects/${projectId}/review/${summary.lastSequence ?? 1}`)
  }
  const task = await getTaskBySequence(projectId, seq)
  if (!task) {
    redirect(`/projects/${projectId}/review/${summary.lastSequence ?? 1}`)
  }

  return (
    <ReviewClient
      project={{ id: project.id, name: project.name, totalTasks: project.totalTasks }}
      initialTask={{
        id: task.id,
        sequence: task.sequence,
        content: task.content,
        pageNumber: task.pageNumber,
        status: task.status,
        remark: task.remark,
      }}
      initialProcessed={project.passedTasks + project.deferredTasks}
    />
  )
}
```

- [ ] **Step 3: 写 src/components/ReviewClient.tsx**

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TaskStatusBadge } from './TaskStatusBadge'

interface TaskData {
  id: string
  sequence: number
  content: string
  pageNumber: number | null
  status: string
  remark: string | null
}

interface ReviewClientProps {
  project: { id: string; name: string; totalTasks: number }
  initialTask: TaskData
  initialProcessed: number
}

export function ReviewClient({ project, initialTask, initialProcessed }: ReviewClientProps) {
  const router = useRouter()
  const [task, setTask] = useState<TaskData>(initialTask)
  const [remarkDraft, setRemarkDraft] = useState(initialTask.remark ?? '')
  const [processed, setProcessed] = useState(initialProcessed)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const cacheRef = useRef(new Map<number, TaskData>([[initialTask.sequence, initialTask]]))

  const dirty = remarkDraft !== (task.remark ?? '')
  const isFirst = task.sequence <= 1
  const isLast = task.sequence >= project.totalTasks

  const fetchTask = useCallback(
    async (seq: number): Promise<TaskData | null> => {
      const cached = cacheRef.current.get(seq)
      if (cached) return cached
      try {
        const res = await fetch(`/api/projects/${project.id}/tasks/${seq}`)
        if (!res.ok) return null
        const body = await res.json()
        cacheRef.current.set(seq, body.task)
        return body.task as TaskData
      } catch {
        return null
      }
    },
    [project.id],
  )

  // 预取相邻 Task
  useEffect(() => {
    if (!isFirst) void fetchTask(task.sequence - 1)
    if (!isLast) void fetchTask(task.sequence + 1)
  }, [task.sequence, isFirst, isLast, fetchTask])

  // 保存最后停留位置（尽力而为，失败不影响浏览）
  useEffect(() => {
    void fetch(`/api/projects/${project.id}/progress`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ taskId: task.id }),
    }).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, task.id])

  // 切换 Task 后焦点移至内容区
  useEffect(() => {
    contentRef.current?.focus()
  }, [task.id])

  const applyTask = (next: TaskData) => {
    setTask(next)
    setRemarkDraft(next.remark ?? '')
    setFeedback(null)
    window.history.replaceState(null, '', `/projects/${project.id}/review/${next.sequence}`)
  }

  const navigate = async (seq: number) => {
    if (seq < 1 || seq > project.totalTasks || saving) return
    if (dirty && !window.confirm('备注尚未保存，是否放弃修改并继续？')) return
    const next = await fetchTask(seq)
    if (!next) {
      setFeedback({ kind: 'error', text: '加载失败，请检查网络后重试' })
      return
    }
    applyTask(next)
  }

  const saveReview = async (status: 'PASSED' | 'DEFERRED') => {
    if (saving) return
    if (status === 'DEFERRED' && remarkDraft.trim().length === 0) {
      setFeedback({ kind: 'error', text: '暂时遗留必须填写备注' })
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/review`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, status, remark: remarkDraft }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFeedback({ kind: 'error', text: body.error ?? '保存失败，请重试' })
        return
      }
      const wasPending = task.status === 'PENDING'
      setTask({ ...task, status, remark: remarkDraft === '' ? null : remarkDraft })
      setProcessed((p) => (wasPending ? p + 1 : p))
      setFeedback({ kind: 'ok', text: '已保存' })
      if (isLast) {
        router.push(`/projects/${project.id}/result`)
        return
      }
      const next = await fetchTask(task.sequence + 1)
      if (next) applyTask(next)
    } catch {
      setFeedback({ kind: 'error', text: '网络异常，保存失败，请重试' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between text-sm">
        <Link href="/" className="text-blue-600 underline focus-visible:outline-2 focus-visible:outline-blue-600">
          ← 返回项目列表
        </Link>
        <span className="text-gray-500">{project.name}</span>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>
          第 {task.sequence} / {project.totalTasks} 条
        </span>
        <span>
          已处理 {processed} / {project.totalTasks}
        </span>
      </div>

      <div
        ref={contentRef}
        tabIndex={-1}
        className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <div className="flex items-center justify-between">
          <TaskStatusBadge status={task.status} />
          {task.pageNumber !== null && <span className="text-xs text-gray-500">第 {task.pageNumber} 页</span>}
        </div>
        <p className="mt-4 whitespace-pre-wrap break-words text-lg leading-relaxed">{task.content}</p>
      </div>

      <div className="mt-4">
        <label htmlFor="remark" className="block text-sm font-medium text-gray-700">
          备注（暂时遗留时必填，不超过 2000 字）
        </label>
        <textarea
          id="remark"
          value={remarkDraft}
          maxLength={2000}
          rows={3}
          onChange={(e) => setRemarkDraft(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-600"
          placeholder="填写备注…"
        />
      </div>

      <div aria-live="polite" className="mt-2 min-h-5 text-sm">
        {feedback?.kind === 'ok' && <p className="text-green-700">{feedback.text}</p>}
        {feedback?.kind === 'error' && <p className="text-red-700">{feedback.text}</p>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          type="button"
          disabled={isFirst || saving}
          onClick={() => void navigate(task.sequence - 1)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          上一条
        </button>
        <button
          type="button"
          disabled={isLast || saving}
          onClick={() => void navigate(task.sequence + 1)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          下一条/跳过
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveReview('PASSED')}
          className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
        >
          {saving ? '保存中…' : '通过'}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveReview('DEFERRED')}
          className="rounded-lg bg-amber-500 px-3 py-2 text-sm text-white hover:bg-amber-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        >
          {saving ? '保存中…' : '暂时遗留'}
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: 验证构建**

Run: `npm run build`
Expected: 编译成功，无类型错误。

- [ ] **Step 5: Commit**

```bash
git add "src/app/projects" src/components/ReviewClient.tsx src/components/TaskStatusBadge.tsx
git commit -m "feat: add one-at-a-time task review page"
```

---

### Task 12: 审核结果页与错误状态

**Files:**
- Create: `src/app/projects/[projectId]/result/page.tsx`
- Create: `src/app/not-found.tsx`

- [ ] **Step 1: 写 src/app/projects/[projectId]/result/page.tsx**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProjectSummary } from '@/lib/services/project-service'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ projectId: string }> }

export default async function ResultPage({ params }: Params) {
  const { projectId } = await params
  const summary = await getProjectSummary(projectId)
  if (!summary) notFound()
  const { project, firstPendingSequence, firstDeferredSequence } = summary

  const processed = project.passedTasks + project.deferredTasks
  const percent = project.totalTasks > 0 ? Math.round((processed / project.totalTasks) * 100) : 0

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">{project.name} — 审核结果</h1>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-gray-500">任务总数</dt>
            <dd className="mt-1 text-xl font-semibold">{project.totalTasks}</dd>
          </div>
          <div>
            <dt className="text-gray-500">已通过</dt>
            <dd className="mt-1 text-xl font-semibold text-green-700">{project.passedTasks}</dd>
          </div>
          <div>
            <dt className="text-gray-500">暂时遗留</dt>
            <dd className="mt-1 text-xl font-semibold text-amber-700">{project.deferredTasks}</dd>
          </div>
          <div>
            <dt className="text-gray-500">待处理</dt>
            <dd className="mt-1 text-xl font-semibold text-gray-700">{project.pendingTasks}</dd>
          </div>
        </dl>
        <div
          className="mt-4 h-2 w-full rounded-full bg-gray-200"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`审核进度 ${percent}%`}
        >
          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-sm text-gray-600">审核进度 {percent}%</p>
      </div>

      {project.pendingTasks > 0 && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          已到达最后一条，仍有 {project.pendingTasks} 条待处理。
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {project.pendingTasks > 0 && firstPendingSequence !== null && (
          <Link
            href={`/projects/${project.id}/review/${firstPendingSequence}`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            继续处理待处理任务
          </Link>
        )}
        {firstDeferredSequence !== null && (
          <Link
            href={`/projects/${project.id}/review/${firstDeferredSequence}`}
            className="rounded-lg bg-amber-500 px-4 py-2 text-white hover:bg-amber-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          >
            查看暂时遗留任务
          </Link>
        )}
        <Link
          href="/"
          className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          返回项目列表
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: 写 src/app/not-found.tsx**

```tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl p-6 text-center">
      <h1 className="mt-16 text-2xl font-bold">404 — 页面或项目不存在</h1>
      <Link href="/" className="mt-6 inline-block text-blue-600 underline">
        返回项目列表
      </Link>
    </main>
  )
}
```

- [ ] **Step 3: 验证构建与全部测试**

Run:
```bash
npm run build
npm test
```
Expected: 编译成功；全部测试通过。

- [ ] **Step 4: Commit**

```bash
git add "src/app/projects" src/app/not-found.tsx
git commit -m "feat: add review result page and 404 state"
```

---

### Task 13: 端到端验收冒烟（对齐 PRD 第 12 节）

**Files:**
- Modify: `package.json`（加 fixture 生成脚本）
- Create: `scripts/make-sample-pdf.mjs`

- [ ] **Step 1: 写 scripts/make-sample-pdf.mjs（生成手动验收用样例文件）**

```js
import PDFDocument from 'pdfkit'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'

await mkdir('data', { recursive: true })
const doc = new PDFDocument({ autoFirstPage: false })
const out = createWriteStream('data/验收样例.pdf')
doc.pipe(out)

const pages = [
  ['第一条要求', '第二条要求', '重复条款内容', '第四条要求', '第五条要求', '第六条要求', '第七条要求', '第八条要求'],
  ['第九条要求', '重复条款内容', '第十一条要求', '第十二条要求', '第十三条要求', '第十四条要求', '第十五条要求'],
  ['第十六条要求', '第十七条要求', '第十八条要求', '第十九条要求', '第二十条要求'],
]
for (const lines of pages) {
  doc.addPage()
  doc.fontSize(12)
  for (const line of lines) doc.text(line)
}
doc.end()
out.on('finish', () => console.log('已生成 data/验收样例.pdf（3 页 20 行）'))
```

`package.json` scripts 增加：`"sample:pdf": "node scripts/make-sample-pdf.mjs"`。

- [ ] **Step 2: 启动开发服务器并跑验收清单**

Run:
```bash
node scripts/make-sample-pdf.mjs
npm run dev   # 后台运行
```

人工/半自动核对（浏览器打开 http://localhost:3000）：

- [ ] 上传 `data/验收样例.pdf` → 列表出现新 Project，状态“待审核”，共 20 条
- [ ] 上传 `.txt` 改名文件 / 0 字节文件 → 显示明确拒绝原因
- [ ] 上传 `%PDF-` 开头的损坏文件 → Project 显示“导入失败”及原因
- [ ] 进入 Project → 每次只显示一条 Task，显示“第 1 / 20 条”
- [ ] 点“通过”→ 状态变已通过并自动进入第 2 条
- [ ] 不填备注点“暂时遗留”→ 显示字段错误，不跳转
- [ ] 填备注暂留 → 自动下一条；刷新页面后备注仍在
- [ ] “上一条”返回查看不改状态；首条“上一条”禁用
- [ ] “下一条/跳过”不改变待处理状态；备注有未保存修改时弹确认
- [ ] 离开项目再进入 → 回到最后停留的 Task；刷新页面仍停留在当前 Task
- [ ] 跳过若干条后处理到最后一条 → 结果页提示“仍有 N 条待处理”，Project 不是已完成
- [ ] 点“继续处理待处理任务”→ 定位到第一条待处理
- [ ] 处理完全部 → Project 状态“已完成”，列表入口变“查看结果”
- [ ] 直接访问 `/projects/不存在/review/1` → 404 页

- [ ] **Step 3: 最终检查与提交**

Run:
```bash
npm test && npm run build
```
Expected: 全绿。

```bash
git add package.json scripts
git commit -m "chore: add sample pdf generator for acceptance testing"
```

---

## Self-Review 记录

- **Spec coverage**：设计文档 §3–§9 各节均有对应任务（上传解析 T4/T5/T7、审核事务 T6/T9、Review 页 T11、结果页/404 T12、列表 T10、测试 T2–T9、验收 T13）。
- **Placeholder**：无 TBD/TODO；所有代码步骤含完整代码。
- **Type consistency**：`ExtractedLine`、`CreateProjectResult`、`ProjectSummary`、`UpdateReviewInput`、`ServiceError`、`deriveProjectStatus`、`validateReviewInput` 在定义任务与使用任务间一致；API 响应字段（`task`/`project`/`lastSequence`/`firstPendingSequence` 等）前后一致。
- **已知取舍**：unpdf 替代直接使用 pdfjs-dist（Node DOMMatrix 兼容，底层仍是 pdf.js）；页面服务端组件直接用服务层取数，GET API 仍完整实现以满足 PRD 接口建议。
