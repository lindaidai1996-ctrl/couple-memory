'use client'

import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRightIcon, Button, RefreshIcon } from '@/components/ui/button'

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const t = useTranslations('ErrorPage')

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <p
        className="text-[72px] md:text-[96px] font-bold select-none leading-none mb-4"
        style={{ fontFamily: 'var(--font-latin)', color: '#3a3a3a' }}
      >
        Oops
      </p>
      <p className="text-base text-film-text mb-2">{t('title')}</p>
      <p className="text-sm text-film-muted mb-8">{t('subtitle')}</p>
      <div className="flex items-center gap-3">
        <Button
          onClick={reset}
          scheme="film"
          variant="brand"
          leadingIcon={<RefreshIcon />}
        >
          {t('retry')}
        </Button>
        <Button
          onClick={() => router.push(`/s/${slug}`)}
          scheme="film"
          variant="secondary"
          trailingIcon={<ArrowRightIcon />}
        >
          {t('backHome')}
        </Button>
      </div>
    </div>
  )
}
