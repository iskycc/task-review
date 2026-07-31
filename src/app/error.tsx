'use client'

import { useEffect } from 'react'
import { Button, Card } from '@/components/ui'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[ui] route error:', error.digest ?? error.name) }, [error])
  return <main className="mx-auto max-w-xl px-6 py-24"><Card className="p-8 text-center"><h1 className="text-section-title text-[var(--label-primary)]">页面加载失败</h1><p className="mt-3 text-sm text-[var(--label-secondary)]">数据没有被修改，请检查网络后重试。</p><Button className="mt-6" onClick={reset}>重新加载</Button></Card></main>
}
