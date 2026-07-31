'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'

export function TaskJump({ projectId, totalTasks }: { projectId: string; totalTasks: number }) {
  const router = useRouter()
  const [value, setValue] = useState('')
  function submit(event: FormEvent) {
    event.preventDefault()
    const sequence = Number(value)
    if (Number.isInteger(sequence) && sequence >= 1 && sequence <= totalTasks) router.push(`/projects/${projectId}/review/${sequence}`)
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <label htmlFor="jump-sequence" className="sr-only">跳转到任务序号</label>
      <input id="jump-sequence" inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} placeholder={`1–${totalTasks}`} className="h-10 w-20 rounded-[var(--radius-md)] border border-[var(--separator)] bg-[var(--surface-primary)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--tint)] sm:w-24" />
      <Button type="submit" size="sm" variant="secondary">跳转</Button>
    </form>
  )
}
