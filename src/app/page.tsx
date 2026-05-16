import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { PreferenceDock } from '@/components/preferences/preference-dock'

export default async function Home() {
  const t = await getTranslations('HomePage')

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <PreferenceDock />
      <div className="absolute inset-0 bg-gradient-to-br from-film-bg via-[#2a2420] to-[#1a1510]" />
      <div className="absolute inset-0 bg-[url('/images/auth-bg.jpg')] bg-cover bg-center opacity-40" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />

      <div className="relative z-10 w-full max-w-[480px] mx-4">
        <div className="rounded-[var(--radius-xl)] border border-warm-border bg-warm-surface/95 p-10 shadow-2xl backdrop-blur-md sm:p-12">
          <h1 className="text-3xl font-bold tracking-tight text-warm-text">
            {t('title')}
          </h1>
          <p className="mt-2 text-base text-warm-muted">
            {t('subtitle')}
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full rounded-[var(--radius-lg)] bg-warm-accent px-4 py-3 text-center font-medium text-white transition-colors hover:bg-warm-accent-hover"
            >
              {t('login')}
            </Link>
            <Link
              href="/register"
              className="w-full rounded-[var(--radius-lg)] border border-warm-border px-4 py-3 text-center font-medium text-warm-text transition-colors hover:bg-warm-bg"
            >
              {t('register')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
