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
