'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

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
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {busy ? '上传中…' : '上传 PDF'}
      </button>
      <div aria-live="polite" className="mt-2 text-sm">
        {state.phase === 'busy' && <p className="text-gray-600">{state.message}</p>}
        {state.phase === 'success' && (
          <p className="text-green-700">导入成功，已创建 {state.taskCount} 条任务。</p>
        )}
        {state.phase === 'error' && <p className="text-red-700">{state.message}</p>}
      </div>
    </div>
  )
}
