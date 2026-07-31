'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Check, PauseCircle } from 'lucide-react'
import { Button, Card, Modal, Progress, TextArea, Toast } from '@/components/ui'
import { TaskStatusBadge } from './TaskStatusBadge'
import { AssignmentControl } from './AssignmentControl'
import { ReviewHistory } from './ReviewHistory'

interface TaskData {
  id: string
  sequence: number
  content: string
  pageNumber: number | null
  status: string
  remark: string | null
  reviewVersion: number
  reviewedAt: string | null
  assigned: boolean
}

interface ReviewClientProps {
  project: { id: string; name: string; totalTasks: number }
  initialTask: TaskData
  initialProcessed: number
  initialFilter: 'ALL' | 'PENDING' | 'PASSED' | 'DEFERRED' | 'ASSIGNED'
  canReview: boolean
  canManage: boolean
}

type SavingAction = 'PENDING' | 'PASSED' | 'DEFERRED'

const REMARK_LIMIT = 2000
/** Warn progressively when the remark approaches the limit. */
const REMARK_WARN_AT = 1800
/** Clamp long task text so the action bar stays reachable without scrolling. */
const CONTENT_CLAMP_CLASS = 'max-h-[38vh] overflow-hidden'

export function ReviewClient({ project, initialTask, initialProcessed, initialFilter, canReview, canManage }: ReviewClientProps) {
  const router = useRouter()
  const [task, setTask] = useState<TaskData>(initialTask)
  const [remarkDraft, setRemarkDraft] = useState(initialTask.remark ?? '')
  const [processed, setProcessed] = useState(initialProcessed)
  const [savingAction, setSavingAction] = useState<SavingAction | null>(null)
  const [error, setError] = useState<{ text: string; retry?: () => void } | null>(null)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [pendingSeq, setPendingSeq] = useState<number | null>(null)
  const [pendingDirection, setPendingDirection] = useState<'previous' | 'next' | null>(null)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [remarkFocused, setRemarkFocused] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)
  const actionTokenRef = useRef(0)
  const savingRef = useRef(false)

  const dirty = remarkDraft !== (task.remark ?? '')
  const saving = savingAction !== null
  const isFirst = task.sequence <= 1
  const isLast = task.sequence >= project.totalTasks
  const remarkCount = remarkDraft.length
  const remarkEmphasized = remarkFocused || dirty || task.status === 'DEFERRED'

  const fetchTask = useCallback(
    async (seq: number): Promise<TaskData | null> => {
      try {
        const res = await fetch(`/api/projects/${project.id}/tasks/${seq}`, { cache: 'no-store' })
        if (!res.ok) return null
        const body = await res.json()
        return body.task as TaskData
      } catch {
        return null
      }
    },
    [project.id],
  )

  useEffect(() => {
    void fetch(`/api/projects/${project.id}/progress`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ taskId: task.id, filter: initialFilter }),
    }).catch(() => undefined)
  }, [project.id, task.id, initialFilter])

  useEffect(() => {
    contentRef.current?.focus({ preventScroll: true })
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
    const query = initialFilter === 'ALL' ? '' : `?filter=${initialFilter}`
    window.history.replaceState(null, '', `/projects/${project.id}/review/${next.sequence}${query}`)
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

  const navigateDirection = async (direction: 'previous' | 'next', ignoreDirty = false) => {
    if (saving) return
    if (dirty && !ignoreDirty) {
      setPendingDirection(direction)
      setPendingSeq(direction === 'previous' ? task.sequence - 1 : task.sequence + 1)
      return
    }
    if (initialFilter === 'ALL') {
      requestNavigate(task.sequence + (direction === 'previous' ? -1 : 1))
      return
    }
    const token = ++actionTokenRef.current
    try {
      const response = await fetch(`/api/projects/${project.id}/tasks?filter=${initialFilter}&direction=${direction}&current=${task.sequence}`, { cache: 'no-store' })
      const body = await response.json()
      if (token !== actionTokenRef.current) return
      if (!response.ok) throw new Error()
      if (body.task) applyTask(body.task)
      else if (direction === 'next') router.push(`/projects/${project.id}/result`)
    } catch {
      setError({ text: '加载失败，请检查网络后重试', retry: () => void navigateDirection(direction) })
    }
  }

  // Arrow-key navigation with on-screen hints; never fires while typing in inputs.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      if (pendingSeq !== null) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable)) return
      void navigateDirection(event.key === 'ArrowLeft' ? 'previous' : 'next')
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [task.sequence, pendingSeq, requestNavigate])

  const confirmPendingNavigation = () => {
    if (pendingHref) {
      const href = pendingHref
      setRemarkDraft(task.remark ?? '')
      setPendingHref(null)
      router.push(href)
      return
    }
    if (pendingSeq === null) return
    const seq = pendingSeq
    const direction = pendingDirection
    setRemarkDraft(task.remark ?? '')
    setPendingSeq(null)
    setPendingDirection(null)
    if (initialFilter !== 'ALL' && direction) void navigateDirection(direction, true)
    else void doNavigate(seq)
  }

  const saveReview = async (status: SavingAction, advance = true) => {
    if (savingRef.current) return
    if (status === 'DEFERRED' && remarkDraft.trim().length === 0) {
      setError({ text: '暂时遗留必须填写备注' })
      return
    }
    // Increment token to cancel any stale in-flight navigation fetches after save completes.
    actionTokenRef.current += 1
    savingRef.current = true
    setSavingAction(status)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/review`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, status, remark: remarkDraft, expectedVersion: task.reviewVersion }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 409) {
          setError({ text: body.error ?? '该任务已被更新', retry: () => void fetchTask(task.sequence).then((current) => { if (current) applyTask(current) }) })
        } else {
          setError({ text: body.error ?? '保存失败，请重试', retry: () => void saveReview(status, advance) })
        }
        return
      }
      const updated: TaskData = { ...task, ...body.task }
      setTask(updated)
      setRemarkDraft(updated.remark ?? '')
      setProcessed(body.progress.passedTasks + body.progress.deferredTasks)

      if (!advance) {
        setToast({ id: Date.now(), text: '备注已保存' })
        return
      }
      if (initialFilter !== 'ALL') {
        const nextResponse = await fetch(`/api/projects/${project.id}/tasks?filter=${initialFilter}&direction=next&current=${task.sequence}`, { cache: 'no-store' })
        const nextBody = await nextResponse.json().catch(() => ({}))
        if (!nextResponse.ok) {
          setError({ text: '审核已保存，但下一条加载失败', retry: () => void navigateDirection('next') })
          return
        }
        if (nextBody.task) applyTask(nextBody.task)
        else router.push(`/projects/${project.id}/result`)
        setToast({ id: Date.now(), text: status === 'PASSED' ? '已通过' : '已暂留' })
        return
      }
      if (isLast || body.progress.pendingTasks === 0) {
        router.push(`/projects/${project.id}/result`)
        return
      }
      const next = await fetchTask(task.sequence + 1)
      if (next) applyTask(next)
      else setError({ text: '审核已保存，但下一条加载失败', retry: () => void doNavigate(task.sequence + 1) })
      setToast({ id: Date.now(), text: status === 'PASSED' ? '已通过' : '已暂留' })
    } catch {
      setError({ text: '网络异常，保存失败，请重试', retry: () => void saveReview(status) })
    } finally {
      savingRef.current = false
      setSavingAction(null)
    }
  }

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    const interceptLinks = (event: MouseEvent) => {
      if (!dirty || event.defaultPrevented || event.button !== 0) return
      const target = event.target as Element | null
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.target === '_blank' || anchor.origin !== window.location.origin) return
      event.preventDefault()
      event.stopPropagation()
      setPendingHref(`${anchor.pathname}${anchor.search}${anchor.hash}`)
    }
    document.addEventListener('click', interceptLinks, true)
    return () => document.removeEventListener('click', interceptLinks, true)
  }, [dirty])

  const percent = project.totalTasks > 0 ? Math.round((processed / project.totalTasks) * 100) : 0
  const remaining = Math.max(0, project.totalTasks - processed)
  const clamped = overflowing && !expanded
  const nextLabel = task.status === 'PENDING' ? '跳过' : '下一条'
  const counterClass =
    remarkCount >= REMARK_LIMIT
      ? 'text-[var(--danger-label)]'
      : remarkCount >= REMARK_WARN_AT
        ? 'text-[var(--warning-label)]'
        : 'text-[var(--label-tertiary)]'

  return (
    <div className="mx-auto max-w-[1060px]">
      <header className="mb-8 grid gap-8 sm:mb-10 md:grid-cols-[minmax(0,1fr)_280px] md:items-end">
        <div>
          <p className="editorial-kicker">Reviewing</p>
          <h1 className="mt-3 max-w-3xl break-words text-[36px] font-semibold leading-[1.06] tracking-[-0.045em] sm:text-[56px]">{project.name}</h1>
          <div className="editorial-rule mt-5" aria-hidden="true" />
        </div>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-4"><p className="text-sm text-[var(--label-secondary)]">
            第 <span className="text-base font-medium tabular-nums text-[var(--label-primary)]">{task.sequence}</span>
            <span className="tabular-nums"> / {project.totalTasks}</span> 条
          </p><p className="shrink-0 text-sm font-medium tabular-nums text-[var(--label-primary)]">{percent}%</p></div>
          <Progress value={processed} max={project.totalTasks} label="审核进度" />
          <p className="text-xs text-[var(--label-tertiary)]">已处理 {processed}，剩余 {remaining}</p>
        </div>
      </header>

      {/* Middle zone: distraction-free task reader. */}
      <Card className="min-h-[390px] p-5 sm:min-h-[480px] sm:p-10 lg:p-14">
        <div
          ref={contentRef}
          tabIndex={-1}
          aria-labelledby={`task-content-${task.id}`}
          className="outline-none"
        >
          <div className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--separator)] pb-5">
            <div className="flex flex-wrap items-center gap-2"><TaskStatusBadge status={task.status} /><ReviewHistory taskId={task.id} />{canManage && <AssignmentControl taskId={task.id} />}</div>
            {task.pageNumber !== null && <span className="shrink-0 text-xs tabular-nums text-[var(--label-tertiary)]">第 {task.pageNumber} 页</span>}
          </div>
          <div className="relative mx-auto max-w-[44rem] py-2 sm:py-8">
            <p
              id={`task-content-${task.id}`}
              ref={textRef}
              className={[
                'whitespace-pre-wrap break-words text-[21px] font-normal leading-[1.78] tracking-[-0.015em] text-[var(--label-primary)] sm:text-[27px] sm:leading-[1.7]',
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
      <div className="review-action-dock mt-6 sm:mt-8">
        {/* Errors announce themselves via Toast's role="alert" — no extra aria-live wrapper. */}
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
            disabled={!canReview}
            rows={2}
            className="h-12 min-h-12 focus:h-24 sm:h-auto sm:min-h-0"
            onChange={(e) => setRemarkDraft(e.target.value)}
            onFocus={() => setRemarkFocused(true)}
            onBlur={() => setRemarkFocused(false)}
            placeholder="填写备注…"
            aria-describedby="remark-hint"
          />
          <p id="remark-hint" className={remarkEmphasized ? 'mt-1.5 text-xs text-[var(--label-tertiary)]' : 'sr-only'}>暂时遗留时必填，不超过 {REMARK_LIMIT} 字</p>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              disabled={isFirst || saving}
              onClick={() => void navigateDirection('previous')}
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
              onClick={() => void navigateDirection('next')}
              title={`${nextLabel}（→）`}
              aria-keyshortcuts="ArrowRight"
              className="flex-1 sm:flex-none"
            >
              {nextLabel}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
            {dirty && canReview && (
              <Button variant="ghost" loading={savingAction === 'PENDING'} disabled={saving} onClick={() => void saveReview(task.status as SavingAction, false)} className="col-span-2 sm:flex-none">
                保存备注
              </Button>
            )}
            <Button
              variant="secondary"
              loading={savingAction === 'DEFERRED'}
              disabled={saving || !canReview}
              onClick={() => void saveReview('DEFERRED')}
              className="flex-1 sm:flex-none"
            >
              <PauseCircle className="h-4 w-4" aria-hidden="true" />
              暂时遗留
            </Button>
            <Button
              loading={savingAction === 'PASSED'}
              disabled={saving || !canReview}
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
        <div
          key={toast.id}
          className="pointer-events-none fixed bottom-40 left-1/2 z-40 -translate-x-1/2 motion-safe:animate-toast-in sm:bottom-32"
        >
          <Toast kind="success" className="shadow-[0_8px_32px_rgba(0,0,0,0.16)]">{toast.text}</Toast>
        </div>
      )}

      {/* Unsaved-remark confirmation replaces the native confirm dialog. */}
      <Modal
        open={pendingSeq !== null || pendingHref !== null}
        onClose={() => { setPendingSeq(null); setPendingDirection(null); setPendingHref(null) }}
        title="备注尚未保存"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setPendingSeq(null); setPendingDirection(null); setPendingHref(null) }}>
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
