'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Check, PauseCircle } from 'lucide-react'
import { Button, Card, Modal, Progress, TextArea, Toast } from '@/components/ui'
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

type SavingAction = 'PASSED' | 'DEFERRED'

const REMARK_LIMIT = 2000
/** Warn progressively when the remark approaches the limit. */
const REMARK_WARN_AT = 1800
/** Clamp long task text so the action bar stays reachable without scrolling. */
const CONTENT_CLAMP_CLASS = 'max-h-[38vh] overflow-hidden'

/** Adaptive reader size: short lines get larger type, long passages smaller. */
function contentSizeClass(length: number): string {
  if (length <= 60) return 'text-2xl leading-relaxed'
  if (length <= 300) return 'text-xl leading-relaxed'
  return 'text-lg leading-relaxed'
}

export function ReviewClient({ project, initialTask, initialProcessed }: ReviewClientProps) {
  const router = useRouter()
  const [task, setTask] = useState<TaskData>(initialTask)
  const [remarkDraft, setRemarkDraft] = useState(initialTask.remark ?? '')
  const [processed, setProcessed] = useState(initialProcessed)
  const [savingAction, setSavingAction] = useState<SavingAction | null>(null)
  const [error, setError] = useState<{ text: string; retry?: () => void } | null>(null)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [pendingSeq, setPendingSeq] = useState<number | null>(null)
  const [remarkFocused, setRemarkFocused] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)
  const cacheRef = useRef(new Map<number, TaskData>([[initialTask.sequence, initialTask]]))
  const actionTokenRef = useRef(0)

  const dirty = remarkDraft !== (task.remark ?? '')
  const saving = savingAction !== null
  const isFirst = task.sequence <= 1
  const isLast = task.sequence >= project.totalTasks
  const remarkCount = remarkDraft.length
  const remarkEmphasized = remarkFocused || dirty || task.status === 'DEFERRED'

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

  // Reset expand state per task and detect whether the text needs clamping.
  useEffect(() => {
    setExpanded(false)
  }, [task.id])

  useEffect(() => {
    if (expanded) return
    const el = textRef.current
    if (!el) return
    const check = () => setOverflowing(el.scrollHeight > el.clientHeight + 4)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [task.id, expanded])

  // Auto-dismiss the success toast; errors stay as an inline notice instead.
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(timer)
  }, [toast])

  const applyTask = (next: TaskData) => {
    setTask(next)
    setRemarkDraft(next.remark ?? '')
    setError(null)
    // Use native history.replaceState to update the URL only, avoiding a Next.js route transition/re-fetch.
    window.history.replaceState(null, '', `/projects/${project.id}/review/${next.sequence}`)
  }

  const doNavigate = async (seq: number) => {
    const token = ++actionTokenRef.current
    const next = await fetchTask(seq)
    if (token !== actionTokenRef.current) return
    if (!next) {
      setError({ text: '加载失败，请检查网络后重试', retry: () => void doNavigate(seq) })
      return
    }
    applyTask(next)
  }

  const requestNavigate = (seq: number) => {
    if (seq < 1 || seq > project.totalTasks || saving) return
    if (dirty) {
      setPendingSeq(seq)
      return
    }
    void doNavigate(seq)
  }

  // Arrow-key navigation with on-screen hints; never fires while typing in inputs.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      if (pendingSeq !== null) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable)) return
      requestNavigate(task.sequence + (event.key === 'ArrowLeft' ? -1 : 1))
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [task.sequence, pendingSeq, requestNavigate])

  const confirmPendingNavigation = () => {
    if (pendingSeq === null) return
    const seq = pendingSeq
    setPendingSeq(null)
    void doNavigate(seq)
  }

  const saveReview = async (status: SavingAction) => {
    if (saving) return
    if (status === 'DEFERRED' && remarkDraft.trim().length === 0) {
      setError({ text: '暂时遗留必须填写备注' })
      return
    }
    // Increment token to cancel any stale in-flight navigation fetches after save completes.
    actionTokenRef.current += 1
    setSavingAction(status)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/review`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, status, remark: remarkDraft }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError({ text: body.error ?? '保存失败，请重试', retry: () => void saveReview(status) })
        return
      }
      const updated: TaskData = { ...task, status, remark: remarkDraft === '' ? null : remarkDraft }
      cacheRef.current.set(task.sequence, updated)
      const wasPending = task.status === 'PENDING'
      setTask(updated)
      setProcessed((p) => (wasPending ? p + 1 : p))

      if (isLast) {
        router.push(`/projects/${project.id}/result`)
        return
      }
      const next = await fetchTask(task.sequence + 1)
      if (next) applyTask(next)
      setToast({ id: Date.now(), text: status === 'PASSED' ? '已通过' : '已暂留' })
    } catch {
      setError({ text: '网络异常，保存失败，请重试', retry: () => void saveReview(status) })
    } finally {
      setSavingAction(null)
    }
  }

  const percent = project.totalTasks > 0 ? Math.round((processed / project.totalTasks) * 100) : 0
  const remaining = Math.max(0, project.totalTasks - processed)
  const clamped = overflowing && !expanded
  const nextLabel = task.status === 'PENDING' ? '跳过' : '下一条'
  const counterClass =
    remarkCount >= REMARK_LIMIT
      ? 'text-[var(--danger)]'
      : remarkCount >= REMARK_WARN_AT
        ? 'text-[var(--warning)]'
        : 'text-[var(--label-tertiary)]'

  return (
    <div>
      {/* Compact progress header: position + progress in one row. */}
      <header className="mb-6 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm text-[var(--label-secondary)]">
            第 <span className="text-base font-semibold tabular-nums text-[var(--label-primary)]">{task.sequence}</span>
            <span className="tabular-nums"> / {project.totalTasks}</span> 条
            <span className="mx-2 text-[var(--label-tertiary)]" aria-hidden="true">
              ·
            </span>
            已处理 <span className="tabular-nums">{processed}</span>，剩余 <span className="tabular-nums">{remaining}</span>
          </p>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--label-primary)]">{percent}%</p>
        </div>
        <Progress value={processed} max={project.totalTasks} label="审核进度" />
      </header>

      {/* Middle zone: distraction-free task reader. */}
      <Card className="p-6 sm:p-10">
        <div
          ref={contentRef}
          tabIndex={-1}
          className="outline-none focus-visible:rounded-[var(--radius-md)] focus-visible:ring-2 focus-visible:ring-[var(--tint)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--surface-primary)]"
        >
          <div className="mb-6 flex items-baseline justify-between gap-3">
            <TaskStatusBadge status={task.status} />
            {task.pageNumber !== null && (
              <span className="shrink-0 text-xs tabular-nums text-[var(--label-tertiary)]">第 {task.pageNumber} 页</span>
            )}
          </div>
          <div className="relative">
            <p
              ref={textRef}
              className={[
                'max-w-[36em] whitespace-pre-wrap break-words text-[var(--label-primary)]',
                contentSizeClass(task.content.length),
                expanded ? '' : CONTENT_CLAMP_CLASS,
              ].join(' ')}
            >
              {task.content}
            </p>
            {clamped && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--surface-primary)] via-[var(--surface-primary)]/70 to-transparent"
              />
            )}
          </div>
          {overflowing && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[var(--tint)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--tint-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tint)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]"
            >
              {expanded ? '收起' : '展开全文'}
              {expanded ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </Card>

      {/* Bottom zone: sticky action bar with remark + grouped actions. */}
      <div className="sticky bottom-0 z-30 -mx-6 mt-8 border-t border-[var(--separator)] bg-[var(--background)]/85 px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl backdrop-saturate-[1.8]">
        <div aria-live="polite">
          {error && (
            <Toast kind="error" className="mb-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{error.text}</span>
                {error.retry && (
                  <button
                    type="button"
                    onClick={error.retry}
                    className="font-medium text-[var(--tint)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tint)]"
                  >
                    重试
                  </button>
                )}
              </div>
            </Toast>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label
              htmlFor="remark"
              className={[
                'text-xs transition-colors duration-[var(--duration-fast)]',
                remarkEmphasized ? 'font-medium text-[var(--label-primary)]' : 'text-[var(--label-tertiary)]',
              ].join(' ')}
            >
              备注
            </label>
            <span className={`text-xs tabular-nums ${counterClass}`} aria-hidden="true">
              {remarkCount} / {REMARK_LIMIT}
            </span>
          </div>
          <TextArea
            id="remark"
            value={remarkDraft}
            maxLength={REMARK_LIMIT}
            rows={2}
            onChange={(e) => setRemarkDraft(e.target.value)}
            onFocus={() => setRemarkFocused(true)}
            onBlur={() => setRemarkFocused(false)}
            placeholder="填写备注…"
            aria-describedby="remark-hint"
          />
          <p id="remark-hint" className={`mt-1.5 text-xs text-[var(--label-tertiary)] ${remarkEmphasized ? '' : 'invisible'}`}>
            暂时遗留时必填，不超过 {REMARK_LIMIT} 字
          </p>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              disabled={isFirst || saving}
              onClick={() => requestNavigate(task.sequence - 1)}
              title="上一条（←）"
              aria-keyshortcuts="ArrowLeft"
              className="flex-1 sm:flex-none"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              上一条
            </Button>
            <Button
              variant="secondary"
              disabled={isLast || saving}
              onClick={() => requestNavigate(task.sequence + 1)}
              title={`${nextLabel}（→）`}
              aria-keyshortcuts="ArrowRight"
              className="flex-1 sm:flex-none"
            >
              {nextLabel}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              loading={savingAction === 'DEFERRED'}
              disabled={saving}
              onClick={() => void saveReview('DEFERRED')}
              className="flex-1 sm:flex-none"
            >
              <PauseCircle className="h-4 w-4" aria-hidden="true" />
              暂时遗留
            </Button>
            <Button
              loading={savingAction === 'PASSED'}
              disabled={saving}
              onClick={() => void saveReview('PASSED')}
              className="flex-1 sm:flex-none"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              通过
            </Button>
          </div>
        </div>

        <p className="mt-3 hidden text-right text-xs text-[var(--label-tertiary)] sm:block">
          快捷键：
          <kbd className="rounded border border-[var(--separator)] bg-[var(--surface-secondary)] px-1 py-0.5 font-sans text-[10px]">←</kbd>
          {' 上一条 · '}
          <kbd className="rounded border border-[var(--separator)] bg-[var(--surface-secondary)] px-1 py-0.5 font-sans text-[10px]">→</kbd>
          {' 下一条'}
        </p>
      </div>

      {/* Transient success toast: floats above the action bar, never occupies layout space. */}
      {toast && (
        <div key={toast.id} className="pointer-events-none fixed bottom-40 left-1/2 z-40 -translate-x-1/2 sm:bottom-32">
          <Toast kind="success" className="shadow-[0_8px_32px_rgba(0,0,0,0.16)]">{toast.text}</Toast>
        </div>
      )}

      {/* Unsaved-remark confirmation replaces the native confirm dialog. */}
      <Modal
        open={pendingSeq !== null}
        onClose={() => setPendingSeq(null)}
        title="备注尚未保存"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingSeq(null)}>
              继续编辑
            </Button>
            <Button variant="primary" onClick={confirmPendingNavigation}>
              放弃修改并继续
            </Button>
          </>
        }
      >
        当前备注还没有保存，切换任务将放弃这些修改。
      </Modal>
    </div>
  )
}
