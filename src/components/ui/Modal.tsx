'use client'

import { useEffect, type ReactNode } from 'react'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

/** Controlled modal: centered card on desktop, bottom sheet on mobile. Closes on Escape. */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className={[
          'relative w-full max-w-md border border-[var(--separator)] bg-[var(--surface-primary)] p-6',
          'rounded-t-[var(--radius-lg)] sm:rounded-[var(--radius-lg)]',
          'shadow-[0_24px_64px_rgba(0,0,0,0.24)]',
        ].join(' ')}
      >
        <h2 className="text-card-title text-[var(--label-primary)]">{title}</h2>
        <div className="mt-2 text-sm leading-[1.6] text-[var(--label-secondary)]">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  )
}
