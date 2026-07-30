'use client'

import Link from 'next/link'
import { type ReactNode } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export function TopBar() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-[var(--separator)] bg-[var(--surface-primary)]/80 backdrop-blur-xl backdrop-saturate-[1.8]">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="rounded-md text-[17px] font-semibold tracking-[-0.02em] text-[var(--label-primary)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--label-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tint)]"
        >
          PDF Task Review
        </Link>

        <div
          role="group"
          aria-label="主题"
          className="grid grid-cols-3 rounded-[var(--radius-full)] border border-[var(--separator)] bg-[var(--fill)] p-1"
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
        'flex h-11 w-11 items-center justify-center rounded-[var(--radius-full)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tint)]',
        active
          ? 'bg-[var(--surface-elevated)] text-[var(--label-primary)] shadow-sm'
          : 'text-[var(--label-secondary)] hover:text-[var(--label-primary)]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
