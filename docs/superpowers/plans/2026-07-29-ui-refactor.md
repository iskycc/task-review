# Apple-Like UI Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor all user-facing UI of PDF Task Review to a polished macOS/Apple aesthetic with light/dark theme support.

**Architecture:** Replace the existing ad-hoc Tailwind classes with a small internal UI kit (`src/components/ui/*`) built on CSS variables and Tailwind `dark:` variants. All pages and components are restyled; backend and routes stay unchanged.

**Tech Stack:** Next.js 15 + React 19 + TypeScript, Tailwind CSS 4, `lucide-react` icons, CSS custom properties for theming.

**Spec:** `docs/superpowers/specs/2026-07-29-ui-refactor-design.md`

**Conventions:**
- All new components are TypeScript `.tsx` with explicit prop interfaces.
- Colors/spacing use CSS variables; Tailwind utilities handle layout and radius.
- `dark:` variants require Tailwind v4 `@variant dark` setup in `globals.css`.
- User-visible text stays Chinese; code/comments in English.

---

### Task 1: Add icon dependency and Tailwind dark-mode setup

**Files:**
- Modify: `package.json`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/components/ThemeProvider.tsx`
- Create: `src/components/TopBar.tsx`

- [ ] **Step 1: Install `lucide-react` and update package.json**

Run:
```bash
cd /opt/task-review
npm install lucide-react
```

Expected: `package.json` now lists `"lucide-react": "^0.xxx"` in `dependencies`, `package-lock.json` updated.

- [ ] **Step 2: Replace `src/app/globals.css` with design tokens and dark variant**

```css
@import "tailwindcss";

@variant dark (&:where(.dark, .dark *));

:root {
  --bg: #f5f5f7;
  --surface: #ffffff;
  --surface-secondary: #f2f2f7;
  --text-primary: #1d1d1f;
  --text-secondary: #6e6e73;
  --border: rgba(0, 0, 0, 0.08);
  --accent: #0071e3;
  --accent-hover: #0077ed;
  --success: #34c759;
  --warning: #ff9f0a;
  --danger: #ff3b30;
}

.dark {
  --bg: #000000;
  --surface: #1c1c1e;
  --surface-secondary: #2c2c2e;
  --text-primary: #f5f5f7;
  --text-secondary: #8e8e93;
  --border: rgba(255, 255, 255, 0.12);
  --accent: #0a84ff;
  --accent-hover: #409cff;
  --success: #30d158;
  --warning: #ffd60a;
  --danger: #ff453a;
}

html {
  color-scheme: light dark;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif;
  background-color: var(--bg);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 3: Create `src/components/ThemeProvider.tsx`**

```tsx
'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function getResolved(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(theme: Theme) {
  const resolved = getResolved(theme)
  const root = document.documentElement
  if (resolved === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = (localStorage.getItem('theme') as Theme | null) ?? 'system'
    setThemeState(saved)
    const resolved = getResolved(saved)
    setResolvedTheme(resolved)
    apply(saved)

    const listener = (e: MediaQueryListEvent) => {
      const current = localStorage.getItem('theme') as Theme | null
      if (!current || current === 'system') {
        const r = e.matches ? 'dark' : 'light'
        setResolvedTheme(r)
        apply('system')
      }
    }
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [])

  const setTheme = (next: Theme) => {
    localStorage.setItem('theme', next)
    setThemeState(next)
    const resolved = getResolved(next)
    setResolvedTheme(resolved)
    apply(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {mounted ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
```

- [ ] **Step 4: Create `src/components/TopBar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export function TopBar() {
  const { theme, resolvedTheme, setTheme } = useTheme()

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-md"
        >
          PDF Task Review
        </Link>

        <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-secondary)] p-1">
          <ThemeButton active={theme === 'light'} onClick={() => setTheme('light')} label="浅色">
            <Sun className="h-4 w-4" />
          </ThemeButton>
          <ThemeButton active={theme === 'system'} onClick={() => setTheme('system')} label="跟随系统">
            <Monitor className="h-4 w-4" />
          </ThemeButton>
          <ThemeButton active={theme === 'dark'} onClick={() => setTheme('dark')} label="深色">
            <Moon className="h-4 w-4" />
          </ThemeButton>
        </div>
      </div>
    </header>
  )
}

function ThemeButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={[
        'rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        active
          ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 5: Update `src/app/layout.tsx` to use provider and top bar**

```tsx
import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { TopBar } from '@/components/TopBar'

export const metadata: Metadata = {
  title: 'PDF Task Review',
  description: '将 PDF 内容转换为待审核任务',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'system';
                  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (dark) document.documentElement.classList.add('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--bg)] pt-14">
        <ThemeProvider>
          <TopBar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Verify build passes**

Run:
```bash
npm run build
```
Expected: compiles successfully.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/app/globals.css src/app/layout.tsx src/components/ThemeProvider.tsx src/components/TopBar.tsx
git commit -m "feat: add Apple-style design tokens, theme provider and top bar"
```

---

### Task 2: Build core UI kit

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Progress.tsx`
- Create: `src/components/ui/TextArea.tsx`
- Create: `src/components/ui/index.ts`

- [ ] **Step 1: Create `src/components/ui/Button.tsx`**

```tsx
import * as React from 'react'
import { Loader2 } from 'lucide-react'

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-sm active:scale-[0.98]',
  secondary:
    'bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--border)] active:scale-[0.98]',
  success:
    'bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20 active:scale-[0.98]',
  warning:
    'bg-[var(--warning)]/10 text-[var(--warning)] hover:bg-[var(--warning)]/20 active:scale-[0.98]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, children, disabled, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
          'disabled:opacity-50 disabled:pointer-events-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
```

- [ ] **Step 2: Create `src/components/ui/Badge.tsx`**

```tsx
export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

export interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]',
  success: 'bg-[var(--success)]/10 text-[var(--success)]',
  warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  danger: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  info: 'bg-[var(--accent)]/10 text-[var(--accent)]',
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
      ].join(' ')}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 3: Create `src/components/ui/Card.tsx`**

```tsx
export interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl border border-[var(--border)] bg-[var(--surface)]',
        'shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]',
        'dark:shadow-[0_4px_24px_rgba(0,0,0,0.24),0_1px_2px_rgba(0,0,0,0.24)]',
        'transition-shadow hover:shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]',
        'dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.32),0_2px_4px_rgba(0,0,0,0.24)]',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/ui/Progress.tsx`**

```tsx
export interface ProgressProps {
  value: number
  max?: number
  label?: string
}

export function Progress({ value, max = 100, label }: ProgressProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div
      className="w-full"
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? '进度'}
    >
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-secondary)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `src/components/ui/TextArea.tsx`**

```tsx
import * as React from 'react'

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, hint, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]" htmlFor={props.id}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={[
            'w-full rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm',
            'text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-[var(--danger)] focus-visible:ring-[var(--danger)]' : '',
            className,
          ].join(' ')}
          {...props}
        />
        {hint && !error && <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{hint}</p>}
        {error && <p className="mt-1.5 text-xs text-[var(--danger)]">{error}</p>}
      </div>
    )
  },
)
TextArea.displayName = 'TextArea'
```

- [ ] **Step 6: Create `src/components/ui/index.ts`**

```ts
export * from './Button'
export * from './Badge'
export * from './Card'
export * from './Progress'
export * from './TextArea'
```

- [ ] **Step 7: Verify build**

Run:
```bash
npm run build
```
Expected: compiles successfully.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui
git commit -m "feat: add Apple-style UI kit (Button, Badge, Card, Progress, TextArea)"
```

---

### Task 3: Refactor Project List page and Upload button

**Files:**
- Modify: `src/components/ProjectCard.tsx`
- Modify: `src/components/UploadButton.tsx`
- Modify: `src/components/ProjectStatusBadge.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace `src/components/ProjectStatusBadge.tsx`**

```tsx
import { Badge } from '@/components/ui'

const STATUS_MAP: Record<string, { label: string; variant: import('@/components/ui').BadgeVariant }> = {
  PARSING: { label: '解析中', variant: 'info' },
  FAILED: { label: '导入失败', variant: 'danger' },
  READY: { label: '待审核', variant: 'default' },
  REVIEWING: { label: '审核中', variant: 'warning' },
  COMPLETED: { label: '已完成', variant: 'success' },
}

export function ProjectStatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={info.variant}>{info.label}</Badge>
}
```

- [ ] **Step 2: Rewrite `src/components/ProjectCard.tsx`**

```tsx
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { Button, Card, Progress } from '@/components/ui'
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

  let action: React.ReactNode = null
  if (data.status === 'READY' || data.status === 'REVIEWING') {
    const label = data.status === 'READY' ? '开始审核' : '继续审核'
    action = (
      <Link href={`/projects/${data.id}/review/${data.lastSequence ?? 1}`}>
        <Button size="sm">{label}</Button>
      </Link>
    )
  } else if (data.status === 'COMPLETED') {
    action = (
      <Link href={`/projects/${data.id}/result`}>
        <Button variant="secondary" size="sm">查看结果</Button>
      </Link>
    )
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
            <FileText className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">{data.name}</h2>
            <p className="truncate text-sm text-[var(--text-secondary)]">
              {data.originalFileName} · {data.createdAt.toLocaleString('zh-CN')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ProjectStatusBadge status={data.status} />
          {action}
        </div>
      </div>

      {data.status === 'FAILED' && (
        <p className="mt-4 text-sm text-[var(--danger)]">导入失败：{data.parseError ?? '未知原因'}</p>
      )}

      {data.status === 'PARSING' && (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">正在解析 PDF 并创建任务…</p>
      )}

      {data.totalTasks > 0 && data.status !== 'FAILED' && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>
              共 {data.totalTasks} 条 · 已通过 {data.passedTasks} · 暂留 {data.deferredTasks} · 待处理 {data.pendingTasks}
            </span>
            <span>{percent}%</span>
          </div>
          <Progress value={processed} max={data.totalTasks} label={`审核进度 ${percent}%`} />
        </div>
      )}
    </Card>
  )
}
```

- [ ] **Step 3: Rewrite `src/components/UploadButton.tsx`**

```tsx
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui'

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
        router.refresh()
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
      <Button onClick={() => inputRef.current?.click()} loading={busy} disabled={busy}>
        <Upload className="h-4 w-4" aria-hidden="true" />
        上传 PDF
      </Button>
      <div aria-live="polite" className="mt-2 text-sm">
        {state.phase === 'busy' && <p className="text-[var(--text-secondary)]">{state.message}</p>}
        {state.phase === 'success' && (
          <p className="text-[var(--success)]">导入成功，已创建 {state.taskCount} 条任务。</p>
        )}
        {state.phase === 'error' && <p className="text-[var(--danger)]">{state.message}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rewrite `src/app/page.tsx`**

```tsx
import { FileText } from 'lucide-react'
import { listProjects } from '@/lib/services/project-service'
import { UploadButton } from '@/components/UploadButton'
import { ProjectCard } from '@/components/ProjectCard'
import { Button } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const items = await listProjects()

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Projects</h1>
          <p className="mt-1 text-[var(--text-secondary)]">上传 PDF，逐项审核任务</p>
        </div>
        <UploadButton />
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
            <FileText className="h-8 w-8" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">还没有审核项目</h2>
          <p className="mt-1 text-[var(--text-secondary)]">点击右上角“上传 PDF”创建第一个 Project</p>
          <div className="mt-6">
            <Button>上传 PDF</Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map(({ project, lastSequence }) => (
            <li key={project.id}>
              <ProjectCard
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
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

Note: the empty-state “上传 PDF” button is non-functional decoration; the real upload control is the header `UploadButton` (same pattern as before). If desired, wire the empty-state button to trigger the hidden input via a shared callback — the plan keeps it simple/decorative per YAGNI.

- [ ] **Step 5: Verify build and tests**

Run:
```bash
npm run build
npm test
```
Expected: build passes, 51 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/components/ProjectCard.tsx src/components/UploadButton.tsx src/components/ProjectStatusBadge.tsx
git commit -m "feat: refactor project list page to Apple style"
```

---

### Task 4: Refactor Review page

**Files:**
- Modify: `src/components/TaskStatusBadge.tsx`
- Modify: `src/app/projects/[projectId]/review/[sequence]/page.tsx`
- Modify: `src/components/ReviewClient.tsx`

- [ ] **Step 1: Replace `src/components/TaskStatusBadge.tsx`**

```tsx
import { Badge } from '@/components/ui'

const STATUS_MAP: Record<string, { label: string; variant: import('@/components/ui').BadgeVariant }> = {
  PENDING: { label: '待处理', variant: 'default' },
  PASSED: { label: '已通过', variant: 'success' },
  DEFERRED: { label: '暂时遗留', variant: 'warning' },
}

export function TaskStatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={info.variant}>{info.label}</Badge>
}
```

- [ ] **Step 2: Update `src/app/projects/[projectId]/review/[sequence]/page.tsx`**

Only layout wrapper changes; logic stays the same. Remove the manual `<main>` styling since global layout now handles spacing.

```tsx
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getProjectSummary, getTaskBySequence } from '@/lib/services/project-service'
import { ReviewClient } from '@/components/ReviewClient'
import { Button } from '@/components/ui'

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
      <main className="mx-auto max-w-3xl px-6 py-12 text-center">
        <p className="text-[var(--text-secondary)]">项目正在解析中，请稍后在项目列表重新进入。</p>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="secondary">返回项目列表</Button>
        </Link>
      </main>
    )
  }
  if (project.status === 'FAILED' || project.totalTasks === 0) {
    redirect('/')
  }

  if (!Number.isInteger(seq) || seq < 1 || seq > project.totalTasks) {
    redirect(`/projects/${projectId}/review/${summary.lastSequence ?? 1}`)
  }
  const task = await getTaskBySequence(projectId, seq)
  if (!task) {
    redirect(`/projects/${projectId}/review/${summary.lastSequence ?? 1}`)
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回项目列表
          </Button>
        </Link>
        <span className="text-sm font-medium text-[var(--text-secondary)]">{project.name}</span>
      </div>

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
    </main>
  )
}
```

- [ ] **Step 3: Rewrite `src/components/ReviewClient.tsx`**

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Check, PauseCircle } from 'lucide-react'
import { Button, Card, Progress, TextArea } from '@/components/ui'
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
  const actionTokenRef = useRef(0)

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

  useEffect(() => {
    if (!isFirst) void fetchTask(task.sequence - 1)
    if (!isLast) void fetchTask(task.sequence + 1)
  }, [task.sequence, isFirst, isLast, fetchTask])

  useEffect(() => {
    void fetch(`/api/projects/${project.id}/progress`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ taskId: task.id }),
    }).catch(() => undefined)
  }, [project.id, task.id])

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
    const token = ++actionTokenRef.current
    const next = await fetchTask(seq)
    if (token !== actionTokenRef.current) return
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
    actionTokenRef.current += 1
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
      const updated: TaskData = { ...task, status, remark: remarkDraft === '' ? null : remarkDraft }
      cacheRef.current.set(task.sequence, updated)
      const wasPending = task.status === 'PENDING'
      setTask(updated)
      setProcessed((p) => (wasPending ? p + 1 : p))

      if (isLast) {
        setFeedback({ kind: 'ok', text: '已保存' })
        router.push(`/projects/${project.id}/result`)
        return
      }
      const next = await fetchTask(task.sequence + 1)
      if (next) {
        applyTask(next)
        setFeedback({ kind: 'ok', text: '已保存' })
      } else {
        setFeedback({ kind: 'ok', text: '已保存' })
      }
    } catch {
      setFeedback({ kind: 'error', text: '网络异常，保存失败，请重试' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            第 {task.sequence} / {project.totalTasks} 条
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            已处理 {processed} / {project.totalTasks}
          </p>
        </div>
        <div className="w-1/2 max-w-xs">
          <Progress value={processed} max={project.totalTasks} label="审核进度" />
        </div>
      </div>

      <Card className="p-6 sm:p-8">
        <div
          ref={contentRef}
          tabIndex={-1}
          className="outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bg)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <TaskStatusBadge status={task.status} />
            {task.pageNumber !== null && (
              <span className="text-xs font-medium text-[var(--text-secondary)]">第 {task.pageNumber} 页</span>
            )}
          </div>
          <p className="whitespace-pre-wrap break-words text-xl leading-relaxed text-[var(--text-primary)] sm:text-2xl">
            {task.content}
          </p>
        </div>

        <div className="mt-8">
          <TextArea
            id="remark"
            label="备注"
            hint="暂时遗留时必填，不超过 2000 字"
            value={remarkDraft}
            maxLength={2000}
            rows={3}
            onChange={(e) => setRemarkDraft(e.target.value)}
            placeholder="填写备注…"
          />
        </div>

        <div aria-live="polite" className="mt-4 min-h-6">
          {feedback?.kind === 'ok' && <p className="text-sm font-medium text-[var(--success)]">{feedback.text}</p>}
          {feedback?.kind === 'error' && <p className="text-sm font-medium text-[var(--danger)]">{feedback.text}</p>}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={isFirst || saving}
            onClick={() => void navigate(task.sequence - 1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            上一条
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={isLast || saving}
            onClick={() => void navigate(task.sequence + 1)}
          >
            下一条/跳过
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="ml-auto flex items-center gap-3">
            <Button loading={saving} disabled={saving} onClick={() => void saveReview('PASSED')}>
              <Check className="h-4 w-4" aria-hidden="true" />
              通过
            </Button>
            <Button variant="warning" loading={saving} disabled={saving} onClick={() => void saveReview('DEFERRED')}>
              <PauseCircle className="h-4 w-4" aria-hidden="true" />
              暂时遗留
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Verify build and tests**

Run:
```bash
npm run build
npm test
```
Expected: build passes, 51 tests pass.

- [ ] **Step 5: Commit**

```bash
git add "src/app/projects/[projectId]/review/[sequence]/page.tsx" src/components/ReviewClient.tsx src/components/TaskStatusBadge.tsx
git commit -m "feat: refactor review page to Apple style"
```

---

### Task 5: Refactor Result page and 404 page

**Files:**
- Modify: `src/app/projects/[projectId]/result/page.tsx`
- Modify: `src/app/not-found.tsx`

- [ ] **Step 1: Rewrite `src/app/projects/[projectId]/result/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, PauseCircle, Circle, FileText, ArrowLeft } from 'lucide-react'
import { getProjectSummary } from '@/lib/services/project-service'
import { Button, Card, Progress } from '@/components/ui'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ projectId: string }> }

function RingProgress({ percent }: { percent: number }) {
  const safe = Math.min(100, Math.max(0, percent))
  const radius = 52
  const stroke = 10
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const offset = circumference - (safe / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={radius * 2} height={radius * 2} aria-hidden="true">
        <circle
          stroke="var(--surface-secondary)"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{
            strokeDasharray: `${circumference} ${circumference}`,
            strokeDashoffset: offset,
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 300ms ease-out',
          }}
        />
      </svg>
      <span className="absolute text-2xl font-semibold text-[var(--text-primary)]">{safe}%</span>
    </div>
  )
}

export default async function ResultPage({ params }: Params) {
  const { projectId } = await params
  const summary = await getProjectSummary(projectId)
  if (!summary) notFound()
  const { project, firstPendingSequence, firstDeferredSequence } = summary

  const processed = project.passedTasks + project.deferredTasks
  const percent = project.totalTasks > 0 ? Math.round((processed / project.totalTasks) * 100) : 0

  const statItems = [
    { label: '任务总数', value: project.totalTasks, icon: FileText, variant: 'default' as const },
    { label: '已通过', value: project.passedTasks, icon: CheckCircle2, variant: 'success' as const },
    { label: '暂时遗留', value: project.deferredTasks, icon: PauseCircle, variant: 'warning' as const },
    { label: '待处理', value: project.pendingTasks, icon: Circle, variant: project.pendingTasks > 0 ? ('danger' as const) : ('default' as const) },
  ]

  return (
    <main className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回项目列表
          </Button>
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{project.name}</h1>
      <p className="mt-1 text-[var(--text-secondary)]">审核结果</p>

      <Card className="mt-6 p-6 sm:p-8">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statItems.map(({ label, value, icon: Icon, variant }) => (
            <div key={label} className="rounded-xl bg-[var(--surface-secondary)] p-4">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-col items-center gap-4">
          <RingProgress percent={percent} />
          <p className="text-sm font-medium text-[var(--text-secondary)]">审核进度 {percent}%</p>
        </div>

        <div className="mt-6">
          <Progress value={processed} max={project.totalTasks} label={`审核进度 ${percent}%`} />
        </div>
      </Card>

      {project.pendingTasks > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--warning)]/20 bg-[var(--warning)]/10 p-4 text-sm text-[var(--warning)]">
          <PauseCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          已到达最后一条，仍有 {project.pendingTasks} 条待处理。
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {project.pendingTasks > 0 && firstPendingSequence !== null && (
          <Link href={`/projects/${project.id}/review/${firstPendingSequence}`}>
            <Button>继续处理待处理任务</Button>
          </Link>
        )}
        {firstDeferredSequence !== null && (
          <Link href={`/projects/${project.id}/review/${firstDeferredSequence}`}>
            <Button variant="warning">查看暂时遗留任务</Button>
          </Link>
        )}
        <Link href="/">
          <Button variant="secondary">返回项目列表</Button>
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Rewrite `src/app/not-found.tsx`**

```tsx
import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { Button, Card } from '@/components/ui'

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      <Card className="w-full p-8 sm:p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
          <FileQuestion className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">页面或项目不存在</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          你访问的页面可能已被移除，或项目 ID 不存在。
        </p>
        <div className="mt-6">
          <Link href="/">
            <Button>
              返回项目列表
            </Button>
          </Link>
        </div>
      </Card>
    </main>
  )
}
```

- [ ] **Step 3: Verify build and tests**

Run:
```bash
npm run build
npm test
```
Expected: build passes, 51 tests pass.

- [ ] **Step 4: Commit**

```bash
git add "src/app/projects/[projectId]/result/page.tsx" src/app/not-found.tsx
git commit -m "feat: refactor result and 404 pages to Apple style"
```

---

### Task 6: Final verification and Docker screenshot

**Files:**
- Verify: all previously modified files
- Optional review: existing tests under `src/lib` or `src/components` that assert class names may fail after class changes; fix only if broken.

- [ ] **Step 1: Run full build and test**

Run:
```bash
cd /opt/task-review
npm run build
npm test
```
Expected: build succeeds with zero errors, 51 tests pass.

- [ ] **Step 2: Build Docker image**

Run:
```bash
cd /opt/task-review
docker build -t pdf-task-review:apple-ui .
```
Expected: image builds successfully and tags as `pdf-task-review:apple-ui`.

- [ ] **Step 3: Start container**

Run:
```bash
docker run -d --rm -p 3000:3000 --name pdf-task-review-ui pdf-task-review:apple-ui
```
Expected: container starts. Wait ~5 seconds for Next.js to boot and Prisma to push the schema.

- [ ] **Step 4: Seed sample project (optional but recommended)**

If the project has a sample PDF generator:
```bash
npm run sample:pdf
# Upload the generated sample PDF through the UI, or use curl if an API endpoint is available.
```
Otherwise, verify the empty-state and theme toggle visually.

- [ ] **Step 5: Capture screenshot outside the project folder**

Install/use a headless browser tool such as `puppeteer` or `playwright` in a temporary directory, or use a system tool if available. Save the screenshot to `/tmp/pdf-task-review-ui.png` (NOT inside `/opt/task-review`).

Example with `puppeteer`:
```bash
mkdir -p /tmp/screenshot-work
cd /tmp/screenshot-work
npm init -y
npm install puppeteer
node -e "
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: '/tmp/pdf-task-review-ui.png', fullPage: false });
  await browser.close();
})();
"
```

Expected: `/tmp/pdf-task-review-ui.png` exists and shows the Apple-style UI.

- [ ] **Step 6: Stop container**

Run:
```bash
docker stop pdf-task-review-ui
```
Expected: container stops and is removed (`--rm`).

- [ ] **Step 7: Final commit and status check**

Run:
```bash
git status
```
Expected: working tree clean (all changes committed).

```bash
git log --oneline -6
```
Expected: six commits for the refactor (one per task plus the initial design doc).

---

## Self-Review

**1. Spec coverage**
- Design tokens and dark mode: Task 1.
- UI kit (Button, Badge, Card, Progress, TextArea): Task 2.
- Project list page with cards, empty state, status badges: Task 3.
- Review page with progress, navigation, action bar, remark textarea: Task 4.
- Result page with ring progress, stats grid, action buttons: Task 5.
- 404 page with centered card and icon: Task 5.
- Accessibility (focus rings, aria-live, progressbar role): Tasks 2–5.
- Final Docker build + screenshot outside project folder: Task 6.
- No backend changes: all tasks only touch frontend/components.

**2. Placeholder scan**
- All steps contain complete code blocks.
- No "TBD", "TODO", "implement later", or vague "handle edge cases" steps.
- Verification commands and expected outputs are explicit.

**3. Type consistency**
- `BadgeVariant` is imported from `@/components/ui` consistently.
- `ProjectCardData` interface matches `ProjectCard` usage in `page.tsx`.
- `ReviewClient` props match the async page signature used in Task 4.
- `RingProgress` is local to the result page and uses `var(--accent)`.
- `lucide-react` icon names are correct and imported.
