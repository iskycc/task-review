import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PDF Task Review',
  description: '将 PDF 内容转换为待审核任务',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
