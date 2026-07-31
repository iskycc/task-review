'use client'

import { useEffect, useState } from 'react'
import { Button, Modal, Toast } from '@/components/ui'

type Member = { id: string; username: string; displayName: string; assigned: boolean }

export function AssignmentControl({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    if (!open) return
    void fetch(`/api/tasks/${taskId}/assignments`).then(async (response) => {
      const body = await response.json()
      if (response.ok) setMembers(body.members)
      else setError(body.error ?? '加载失败')
    })
  }, [open, taskId])
  async function toggle(member: Member) {
    const response = await fetch(`/api/tasks/${taskId}/assignments`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: member.id, assigned: !member.assigned }) })
    const body = await response.json()
    if (!response.ok) return setError(body.error ?? '保存失败')
    setMembers((current) => current.map((item) => item.id === member.id ? { ...item, assigned: !item.assigned } : item))
  }
  return <><Button size="sm" variant="secondary" onClick={() => setOpen(true)}>分配审核人</Button><Modal open={open} onClose={() => setOpen(false)} title="分配审核人" footer={<Button variant="secondary" onClick={() => setOpen(false)}>完成</Button>}>{error && <Toast kind="error" className="mb-3">{error}</Toast>}<ul className="divide-y divide-[var(--separator)] rounded-[var(--radius-md)] border border-[var(--separator)]">{members.map((member) => <li key={member.id} className="flex items-center justify-between gap-3 px-3 py-2"><span className="text-sm"><strong className="block font-medium">{member.displayName}</strong><span className="text-[var(--label-tertiary)]">@{member.username}</span></span><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={member.assigned} onChange={() => void toggle(member)} />已分配</label></li>)}</ul></Modal></>
}
