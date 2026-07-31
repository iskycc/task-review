'use client'

import Link from 'next/link'
import { type ReactNode } from 'react'
import { LogOut, Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import type { AuthUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export function TopBar({ user }: { user: AuthUser | null }) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <header className="app-topbar fixed inset-x-0 top-0 z-50 border-b border-[var(--separator)] bg-[var(--background)]/88 backdrop-blur-2xl backdrop-saturate-[1.4]">
      <div className="editorial-shell flex h-full items-center justify-between gap-3">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 rounded-md text-[15px] font-semibold tracking-[-0.025em] text-[var(--label-primary)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--label-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tint)] sm:text-[16px]"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--tint)]" aria-hidden="true" />
          <span className="sm:hidden">Review</span>
          <span className="hidden sm:inline">PDF Task Review</span>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-1 text-sm text-[var(--label-secondary)]">
              <span className="hidden max-w-28 truncate md:block">{user.displayName}</span>
              <button type="button" onClick={() => void logout()} title="退出登录" aria-label="退出登录" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tint)]">
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-[var(--tint)]">登录</Link>
          )}
          <div
            role="group"
            aria-label="主题"
            className="grid grid-cols-3 rounded-[var(--radius-full)] bg-[var(--fill)] p-0.5"
          >
            <ThemeButton active={theme === 'light'} onClick={() => setTheme('light')} label="浅色">
              <Sun className="h-4 w-4" />
            </ThemeButton>
            <ThemeButton active={theme === 'system'} onClick={() => setTheme('system')} label="跟随系统">
              <Monitor className="h-4 w-4" />
            </ThemeButton>
            <ThemeButton active={theme === 'dark'} onClick={() => setTheme('dark')} label="深色">
              <Moon className="h-4 w-4" />
            </ThemeButton>
          </div>
        </div>
      </div>
    </header>
  )
}

function ThemeButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={[
        'flex h-8 w-8 items-center justify-center rounded-[var(--radius-full)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] motion-safe:active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tint)] sm:h-9 sm:w-9',
        active
          ? 'bg-[var(--surface-elevated)] text-[var(--label-primary)] shadow-sm'
          : 'text-[var(--label-secondary)] hover:text-[var(--label-primary)]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
