'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, FileText, Upload } from 'lucide-react'
import { Button, Modal, Progress, Toast } from '@/components/ui'

// Pre-check only; the server enforces its own PDF_MAX_SIZE_MB (default 20 MB).
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

type UploadPhase = 'pick' | 'uploading' | 'success' | 'error'

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function UploadButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [phase, setPhase] = useState<UploadPhase>('pick')
  const [stage, setStage] = useState('')
  const [progress, setProgress] = useState(0)
  const [taskCount, setTaskCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  // The API uploads and parses in a single request, so surface both stages
  // with a progress bar that eases toward 90% until the response arrives.
  useEffect(() => {
    if (phase !== 'uploading') return
    setProgress(8)
    setStage('正在上传文件…')
    const stageTimer = setTimeout(() => setStage('正在解析 PDF 并创建任务…'), 1600)
    const timer = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + Math.max(1, (90 - p) * 0.06)))
    }, 240)
    return () => {
      clearTimeout(stageTimer)
      clearInterval(timer)
    }
  }, [phase])

  const reset = () => {
    setFile(null)
    setFileError(null)
    setPhase('pick')
    setStage('')
    setProgress(0)
    setErrorMessage('')
  }

  const closeModal = () => {
    setOpen(false)
    // Start fresh next time once a result (success/error) was shown.
    if (phase === 'success' || phase === 'error') reset()
  }

  const pickFile = (next: File | null | undefined) => {
    if (!next) return
    setFile(next)
    if (!next.name.toLowerCase().endsWith('.pdf')) {
      setFileError('仅支持 .pdf 文件')
    } else if (next.size === 0) {
      setFileError('文件内容为空')
    } else if (next.size > MAX_FILE_SIZE_BYTES) {
      setFileError('文件大小超过 20 MB 限制')
    } else {
      setFileError(null)
    }
  }

  const upload = async () => {
    if (!file || fileError || phase === 'uploading') return
    setPhase('uploading')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/projects', { method: 'POST', body: formData })
      const body = await res.json()
      if (!res.ok) {
        setErrorMessage(body.error ?? '上传失败，请重试')
        setPhase('error')
        router.refresh()
        return
      }
      setProgress(100)
      setTaskCount(body.taskCount)
      setPhase('success')
      router.refresh()
    } catch {
      setErrorMessage('网络异常，上传失败，请重试')
      setPhase('error')
    }
  }

  const fileRow = file && (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--separator)] bg-[var(--surface-primary)] px-3.5 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--fill)] text-[var(--label-tertiary)]">
        <FileText className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--label-primary)]">{file.name}</p>
        <p className="mt-0.5 text-auxiliary text-[var(--label-tertiary)]">{formatFileSize(file.size)}</p>
      </div>
      {fileError ? (
        <span className="shrink-0 text-xs text-[var(--danger-label)]">{fileError}</span>
      ) : (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success-label)]" aria-label="校验通过" />
      )}
    </div>
  )

  const footer =
    phase === 'pick' ? (
      <>
        <Button variant="ghost" onClick={closeModal}>
          取消
        </Button>
        <Button onClick={() => void upload()} disabled={!file || !!fileError}>
          开始上传
        </Button>
      </>
    ) : phase === 'success' ? (
      <Button onClick={closeModal}>完成</Button>
    ) : phase === 'error' ? (
      <>
        <Button
          variant="secondary"
          onClick={() => {
            reset()
            inputRef.current?.click()
          }}
        >
          重新选择文件
        </Button>
        <Button onClick={() => void upload()}>重试</Button>
      </>
    ) : undefined

  return (
    <div className="shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          pickFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <Button size="lg" onClick={() => setOpen(true)}>
        <Upload className="h-5 w-5" aria-hidden="true" />
        上传 PDF
      </Button>

      <Modal
        open={open}
        onClose={closeModal}
        title="上传 PDF"
        footer={footer}
        dismissible={phase !== 'uploading'}
      >
        {phase === 'pick' && (
          <div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                pickFile(e.dataTransfer.files?.[0])
              }}
              className="flex w-full flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--separator)] bg-[var(--surface-secondary)] px-4 py-8 text-sm text-[var(--label-secondary)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tint)]"
            >
              <Upload className="h-6 w-6 text-[var(--label-tertiary)]" aria-hidden="true" />
              点击选择或拖入 PDF 文件
              <span className="text-auxiliary text-[var(--label-tertiary)]">仅支持 PDF，单个文件不超过 20 MB</span>
            </button>
            {fileRow && <div className="mt-3">{fileRow}</div>}
          </div>
        )}

        {phase === 'uploading' && (
          <div aria-live="polite" className="space-y-3">
            {fileRow}
            <Progress value={progress} max={100} label={stage} />
            <p className="text-sm text-[var(--label-secondary)]">{stage}</p>
          </div>
        )}

        {phase === 'success' && (
          <Toast kind="success" className="motion-safe:animate-toast-in">导入成功，已创建 {taskCount} 条任务。</Toast>
        )}
        {phase === 'error' && <Toast kind="error">{errorMessage}</Toast>}
      </Modal>
    </div>
  )
}
