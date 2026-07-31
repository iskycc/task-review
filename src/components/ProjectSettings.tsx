'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Modal, Toast } from '@/components/ui'

type Member = { id: string; username: string; displayName: string; role: string }

export function ProjectSettings({ projectId, initialName }: { projectId: string; initialName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    void fetch(`/api/projects/${projectId}/members`).then(async (response) => {
      const body = await response.json()
      if (response.ok) setMembers(body.members)
    })
  }, [open, projectId])

  async function rename() {
    const response = await fetch(`/api/projects/${projectId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) })
    const body = await response.json()
    if (!response.ok) return setError(body.error ?? '保存失败')
    router.refresh()
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const response = await fetch(`/api/projects/${projectId}/members`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: data.get('username'), role: data.get('role') }),
    })
    const body = await response.json()
    if (!response.ok) return setError(body.error ?? '添加失败')
    setMembers((current) => [...current.filter((member) => member.id !== body.member.id), body.member])
    form.reset()
  }

  async function removeMember(userId: string) {
    const response = await fetch(`/api/projects/${projectId}/members/${userId}`, { method: 'DELETE' })
    const body = await response.json()
    if (!response.ok) return setError(body.error ?? '移除失败')
    setMembers((current) => current.filter((member) => member.id !== userId))
  }

  async function deleteProject() {
    const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
    const body = await response.json()
    if (!response.ok) return setError(body.error ?? '删除失败')
    router.replace('/')
    router.refresh()
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>项目设置</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="项目设置" footer={<Button variant="secondary" onClick={() => setOpen(false)}>完成</Button>}>
        <div className="space-y-6">
          {error && <Toast kind="error">{error}</Toast>}
          <section>
            <h3 className="text-sm font-medium text-[var(--label-primary)]">项目名称</h3>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} className="field-control min-w-0 flex-1" />
              <Button onClick={() => void rename()}>保存</Button>
            </div>
          </section>
          <section>
            <h3 className="text-sm font-medium text-[var(--label-primary)]">项目成员</h3>
            <ul className="mt-2 divide-y divide-[var(--separator)] rounded-[var(--radius-md)] border border-[var(--separator)]">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span className="min-w-0"><strong className="block truncate font-medium">{member.displayName}</strong><span className="text-[var(--label-tertiary)]">@{member.username} · {member.role}</span></span>
                  {member.role !== 'OWNER' && <button type="button" onClick={() => void removeMember(member.id)} className="min-h-11 px-2 text-[var(--danger-label)]">移除</button>}
                </li>
              ))}
            </ul>
            <form onSubmit={addMember} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <input name="username" required placeholder="用户名" className="field-control min-w-0" />
              <select name="role" className="field-control sm:w-auto"><option value="REVIEWER">审核人</option><option value="VIEWER">只读成员</option></select>
              <Button type="submit">添加</Button>
            </form>
          </section>
          <section className="border-t border-[var(--separator)] pt-5">
            <h3 className="text-sm font-medium text-[var(--danger-label)]">危险操作</h3>
            {!confirmDelete ? <Button variant="ghost" className="mt-2 text-[var(--danger-label)]" onClick={() => setConfirmDelete(true)}>删除项目</Button> : (
              <div className="mt-2 flex flex-col gap-3 rounded-[var(--radius-md)] bg-[var(--danger)]/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>将永久删除任务、审核记录和原始 PDF。</span>
                <div className="grid grid-cols-2 gap-2 sm:flex"><Button variant="secondary" onClick={() => setConfirmDelete(false)}>取消</Button><Button onClick={() => void deleteProject()}>确认删除</Button></div>
              </div>
            )}
          </section>
        </div>
      </Modal>
    </>
  )
}
