import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl p-6 text-center">
      <h1 className="mt-16 text-2xl font-bold">404 — 页面或项目不存在</h1>
      <Link href="/" className="mt-6 inline-block text-blue-600 underline">
        返回项目列表
      </Link>
    </main>
  )
}
