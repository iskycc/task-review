import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/AuthForm'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/')
  const hasUsers = (await prisma.user.count()) > 0
  return (
    <main className="editorial-shell grid min-h-[calc(100dvh-3.5rem)] items-center gap-10 py-10 sm:min-h-[calc(100dvh-3.75rem)] sm:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
      <section className="pt-5 lg:pt-0">
        <p className="editorial-kicker">Focused review</p>
        <h1 className="editorial-display mt-5">把文档变成清晰的决定。</h1>
        <div className="editorial-rule mt-7" aria-hidden="true" />
        <p className="mt-6 max-w-lg text-[15px] leading-7 text-[var(--label-secondary)] sm:text-lg">逐条阅读、独立记录、准确追踪。一个为团队审核流程设计的安静工作空间。</p>
      </section>
      <AuthForm hasUsers={hasUsers} registrationEnabled={process.env.ALLOW_REGISTRATION !== 'false'} />
    </main>
  )
}
