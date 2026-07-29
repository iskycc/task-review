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
    // Use native history.replaceState to update the URL only, avoiding a Next.js route transition/re-fetch.
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
    // Increment token to cancel any stale in-flight navigation fetches after save completes.
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

  const percent = project.totalTasks > 0 ? Math.round((processed / project.totalTasks) * 100) : 0
  const remaining = Math.max(0, project.totalTasks - processed)

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              第 {task.sequence} <span className="font-normal text-[var(--text-secondary)]">/ {project.totalTasks}</span> 条
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              已处理 {processed} · 剩余 {remaining}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--text-primary)]">{percent}%</p>
        </div>
        <Progress value={processed} max={project.totalTasks} label="审核进度" />
      </header>

      <Card className="p-8 sm:p-10">
        <div
          ref={contentRef}
          tabIndex={-1}
          className="outline-none focus-visible:rounded-2xl focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--surface)]"
        >
          <div className="mb-6 flex items-center justify-between gap-3">
            <TaskStatusBadge status={task.status} />
            {task.pageNumber !== null && (
              <span className="rounded-full bg-[var(--surface-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                第 {task.pageNumber} 页
              </span>
            )}
          </div>
          <p className="whitespace-pre-wrap break-words text-2xl leading-relaxed text-[var(--text-primary)] sm:text-[1.75rem]">
            {task.content}
          </p>
        </div>

        <div className="mt-10 border-t border-[var(--border)] pt-8">
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

        <div aria-live="polite" className="mt-3 min-h-6">
          {feedback?.kind === 'ok' && <p className="text-sm font-medium text-[var(--success)]">{feedback.text}</p>}
          {feedback?.kind === 'error' && <p className="text-sm font-medium text-[var(--danger)]">{feedback.text}</p>}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-[var(--surface-secondary)] p-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={isFirst || saving}
              onClick={() => void navigate(task.sequence - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              上一条
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isLast || saving}
              onClick={() => void navigate(task.sequence + 1)}
            >
              下一条/跳过
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="warning" loading={saving} disabled={saving} onClick={() => void saveReview('DEFERRED')}>
              <PauseCircle className="h-4 w-4" aria-hidden="true" />
              暂时遗留
            </Button>
            <Button loading={saving} disabled={saving} onClick={() => void saveReview('PASSED')}>
              <Check className="h-4 w-4" aria-hidden="true" />
              通过
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
