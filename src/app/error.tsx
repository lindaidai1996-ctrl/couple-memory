'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRightIcon, Button, RefreshIcon } from '@/components/ui/button'

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
        <Button
          onClick={reset}
          variant="brand"
          leadingIcon={<RefreshIcon />}
        >
          {uiText.retry}
        </Button>
        <Button
          onClick={() => router.push('/')}
          variant="secondary"
          trailingIcon={<ArrowRightIcon />}
        >
          {uiText.backHome}
        </Button>
      </div>
    </div>
  )
}
