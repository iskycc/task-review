'use client'

import { useEffect, useState } from 'react'
import { Button, Modal, Toast } from '@/components/ui'
import { formatDateTime } from '@/lib/format'

type Event = { id: string; previousStatus: string | null; newStatus: string; previousRemark: string | null; newRemark: string | null; version: number; createdAt: string; reviewer: { displayName: string }; actor: { displayName: string } }

export function ReviewHistory({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    if (!open) return
    setError('')
    void fetch(`/api/tasks/${taskId}/history`, { cache: 'no-store' }).then(async (response) => {
      const body = await response.json()
      if (response.ok) setEvents(body.events)
      else setError(body.error ?? '加载失败')
    })
  }, [open, taskId])
  return <><Button size="sm" variant="ghost" onClick={() => setOpen(true)}>审核历史</Button><Modal open={open} onClose={() => setOpen(false)} title="审核历史" footer={<Button variant="secondary" onClick={() => setOpen(false)}>关闭</Button>}>{error && <Toast kind="error" className="mb-3">{error}</Toast>}{events.length ? <ol className="space-y-3">{events.map((event) => <li key={event.id} className="rounded-[var(--radius-md)] border border-[var(--separator)] p-3 text-sm"><div className="flex justify-between gap-3"><strong className="font-medium">{event.reviewer.displayName}：{event.previousStatus ?? 'PENDING'} → {event.newStatus}</strong><time className="shrink-0 text-xs text-[var(--label-tertiary)]">{formatDateTime(new Date(event.createdAt))}</time></div>{event.newRemark && <p className="mt-2 whitespace-pre-wrap text-[var(--label-secondary)]">备注：{event.newRemark}</p>}<p className="mt-1 text-xs text-[var(--label-tertiary)]">操作人：{event.actor.displayName} · 版本 {event.version}</p></li>)}</ol> : !error && <p className="py-8 text-center text-sm text-[var(--label-secondary)]">还没有审核记录</p>}</Modal></>
}
