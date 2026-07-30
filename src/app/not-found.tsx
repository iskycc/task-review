import Link from 'next/link'
import { ArrowLeft, FileQuestion } from 'lucide-react'
import { Button, Card } from '@/components/ui'

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center sm:py-32">
      <Card className="w-full p-10 sm:p-14">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--surface-secondary)] text-[var(--label-tertiary)]">
          <FileQuestion className="h-10 w-10" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold tracking-[0.2em] text-[var(--tint)]">404</p>
        <h1 className="text-section-title mt-3 text-[var(--label-primary)]">页面或项目不存在</h1>
        <p className="text-body mx-auto mt-4 max-w-xs text-[var(--label-secondary)]">
          你访问的页面可能已被移除，或项目 ID 不存在。
        </p>
        <div className="mt-10">
          <Button asChild size="lg" className="min-w-44">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              返回项目列表
            </Link>
          </Button>
        </div>
      </Card>
    </main>
  )
}
