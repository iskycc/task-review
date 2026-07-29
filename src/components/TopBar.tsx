'use client'

import Link from 'next/link'
import { type ReactNode } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export function TopBar() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl backdrop-saturate-[1.8]">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="rounded-md text-[17px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] transition-colors duration-200 hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          PDF Task Review
        </Link>

        <div
          role="group"
          aria-label="主题"
          className="flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] p-1"
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
        'rounded-full p-1.5 transition-all duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        active
          ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] hover:text-[var(--text-primary)]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
