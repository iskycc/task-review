'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'

export function AuthForm({ registrationEnabled, hasUsers }: { registrationEnabled: boolean; hasUsers: boolean }) {
  const router = useRouter()
  const [mode, setMode] = useState(hasUsers ? 'login' : 'register')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username: data.get('username'),
          password: data.get('password'),
          displayName: data.get('displayName'),
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(body.error ?? '操作失败，请重试')
        return
      }
      router.replace('/')
      router.refresh()
    } catch {
      setError('网络异常，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="paper-surface w-full p-6 sm:p-9">
      <p className="editorial-kicker">Account</p>
      <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.035em] text-[var(--label-primary)] sm:text-[34px]">{mode === 'login' ? '欢迎回来' : '创建账号'}</h2>
      <p className="mt-2 text-sm text-[var(--label-secondary)]">
        {mode === 'login' ? '登录后查看分配给你的项目和审核进度。' : hasUsers ? '创建账号后，由项目负责人添加你为成员。' : '首个账号将成为管理员，并接管已有项目。'}
      </p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        {mode === 'register' && (
          <label className="block text-sm font-medium text-[var(--label-primary)]">
            显示名称
            <input name="displayName" required maxLength={50} autoComplete="name" className="field-control mt-2" />
          </label>
        )}
        <label className="block text-sm font-medium text-[var(--label-primary)]">
          用户名
          <input name="username" required minLength={3} maxLength={32} autoCapitalize="none" autoComplete="username" className="field-control mt-2" />
        </label>
        <label className="block text-sm font-medium text-[var(--label-primary)]">
          密码
          <input name="password" type="password" required minLength={10} maxLength={128} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="field-control mt-2" />
        </label>
        {error && <p role="alert" className="text-sm text-[var(--danger-label)]">{error}</p>}
        <Button type="submit" loading={saving} className="w-full">{mode === 'login' ? '登录' : '创建账号'}</Button>
      </form>
      {(mode === 'register' || registrationEnabled) && hasUsers && (
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} className="mt-5 min-h-11 w-full text-sm text-[var(--tint)]">
          {mode === 'login' ? '还没有账号？创建账号' : '已有账号？返回登录'}
        </button>
      )}
    </section>
  )
}
