'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

type Translator = (key: string) => string

export function buildErrorUiText(t: Translator) {
  return {
    title: t('title'),
    subtitle: t('subtitle'),
    retry: t('retry'),
    backHome: t('backHome'),
  }
}

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const t = useTranslations('ErrorPage')
  const uiText = buildErrorUiText(t)

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <p
        className="text-[72px] md:text-[96px] font-bold text-warm-border select-none leading-none mb-4"
        style={{ fontFamily: 'var(--font-latin)' }}
      >
        Oops
      </p>
      <p className="text-base text-warm-text mb-2">{uiText.title}</p>
      <p className="text-sm text-warm-muted mb-8">{uiText.subtitle}</p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 text-sm font-medium text-white bg-warm-accent
            rounded-[var(--radius-md)] hover:bg-warm-accent-hover transition-colors"
        >
          {uiText.retry}
        </button>
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2.5 text-sm font-medium text-warm-muted border border-warm-border
            rounded-[var(--radius-md)] hover:bg-warm-bg transition-colors"
        >
          {uiText.backHome}
        </button>
      </div>
    </div>
  )
}
