import { AuthThemeSwitcher } from '@/components/preferences/auth-theme-switcher'
import { LocaleSwitcher } from '@/components/preferences/locale-switcher'
import { getTranslations } from 'next-intl/server'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('AuthLayout')

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed right-4 top-4 z-30 flex items-center gap-2">
        <LocaleSwitcher />
        <AuthThemeSwitcher />
      </div>
      <div className="absolute inset-0 bg-[var(--dashboard-bg-overlay)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-warm-bg/70 via-warm-bg/40 to-warm-bg/90" />
      <div className="absolute inset-0 bg-[url('/images/auth-bg.jpg')] bg-cover bg-center opacity-18 dark:opacity-16" />
      <div className="absolute inset-0 backdrop-blur-[10px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(111,79,102,0.14),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(183,135,149,0.12),transparent_32%)]" />
      <div className="absolute left-1/2 top-[24%] h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,162,161,0.24),rgba(201,162,161,0.02)_58%,transparent_72%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(167,118,132,0.22),rgba(167,118,132,0.04)_58%,transparent_72%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full items-center justify-center px-3 py-4 sm:px-5">
        <div className="w-full max-w-[440px]">
          <section className="rounded-[34px] border border-warm-border/80 bg-warm-surface/76 shadow-[var(--dashboard-shadow-soft)] backdrop-blur-xl">
            <div className="relative overflow-hidden rounded-[34px] p-[18px] sm:p-5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_center,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(143,96,122,0.12),transparent_30%)]" />
              <div className="relative grid gap-0">
                <div className="mx-auto mb-[-12px] w-full max-w-[356px] rounded-[18px] border border-warm-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.02)),var(--dashboard-surface-gradient)] px-4 py-3 text-center shadow-[var(--dashboard-shadow-card)]">
                  <p className="mb-2 text-left text-[10px] uppercase tracking-[0.28em] text-warm-accent">
                    {t('eyebrow')}
                  </p>

                  <h1 className="mx-auto max-w-[9ch] font-[var(--font-display)] text-[clamp(20px,2.8vw,28px)] leading-[1] tracking-[-0.05em] text-warm-text text-balance">
                    {t('brandTitle')}
                  </h1>
                  <p className="mx-auto mt-1.5 max-w-[22ch] text-[11px] leading-5 text-warm-muted">
                    {t('brandCopy')}
                  </p>
                </div>

                <div className="rounded-[22px] border border-warm-border bg-warm-surface/92 p-4 shadow-[0_24px_70px_rgba(34,18,30,0.18)] backdrop-blur-md sm:p-5">
                  {children}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
