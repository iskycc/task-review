'use client'

import Link from 'next/link'
import { type ReactNode } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export function TopBar() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-md"
        >
          PDF Task Review
        </Link>

        <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-secondary)] p-1">
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
        'rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        active
          ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
