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

  // Prefetch adjacent tasks
  useEffect(() => {
    if (!isFirst) void fetchTask(task.sequence - 1)
    if (!isLast) void fetchTask(task.sequence + 1)
  }, [task.sequence, isFirst, isLast, fetchTask])

  // Save last position (best-effort; failure must not block browsing)
  useEffect(() => {
    void fetch(`/api/projects/${project.id}/progress`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ taskId: task.id }),
    }).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, task.id])

  // Move focus to the content area after switching tasks
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
      const updated = { ...task, status, remark: remarkDraft === '' ? null : remarkDraft }
      setTask(updated)
      // Keep the prefetch cache in sync so revisiting this sequence shows the saved state
      cacheRef.current.set(task.sequence, updated)
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
