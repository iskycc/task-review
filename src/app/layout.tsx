import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/noto-sans-sc'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { TopBar } from '@/components/TopBar'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'PDF 任务审核',
  description: '上传 PDF 文档，自动解析为任务清单并逐项审核',
}

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f4f1' },
    { media: '(prefers-color-scheme: dark)', color: '#111114' },
  ],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'system';
                  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (dark) document.documentElement.classList.add('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="app-body min-h-screen bg-[var(--bg)]">
        <ThemeProvider>
          <TopBar user={user} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
