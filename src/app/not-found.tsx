import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { Button, Card } from '@/components/ui'

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      <Card className="w-full p-8 sm:p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
          <FileQuestion className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">页面或项目不存在</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          你访问的页面可能已被移除，或项目 ID 不存在。
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/">返回项目列表</Link>
          </Button>
        </div>
      </Card>
    </main>
  )
}
