'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import {
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  type AppLocale,
} from '@/lib/preferences'

function setLocaleCookie(value: AppLocale) {
  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`
}

export function buildLocaleSwitcherOptionClassName(active: boolean) {
  return `rounded-full border px-2.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none ${
    active
      ? 'dashboard-pill-active'
      : 'border-transparent text-warm-text hover:bg-white/50 dark:hover:bg-white/8'
  }`
}

export function LocaleSwitcher() {
  const t = useTranslations('Common')
  const locale = useLocale() as AppLocale
  const router = useRouter()
  const [pendingLocale, setPendingLocale] = useState<AppLocale>(locale)
  const [isPending, startTransition] = useTransition()
  const activeLocale = isPending ? pendingLocale : locale

  function handleChange(nextLocale: AppLocale) {
    if (nextLocale === activeLocale) return
    setPendingLocale(nextLocale)
    setLocaleCookie(nextLocale)
    startTransition(() => {
      router.refresh()
    })
  }

  const labelMap: Record<AppLocale, string> = {
    'zh-CN': t('languageChinese'),
    en: t('languageEnglish'),
  }

  return (
    <div
      className="inline-flex rounded-full border border-warm-border bg-white/40 p-1 text-xs shadow-sm backdrop-blur dark:bg-white/4"
      aria-label={t('languageLabel')}
    >
      {SUPPORTED_LOCALES.map(option => {
        const active = option === activeLocale
        return (
          <button
            key={option}
            type="button"
            onClick={() => handleChange(option)}
            className={buildLocaleSwitcherOptionClassName(active)}
            aria-pressed={active}
          >
            {labelMap[option]}
          </button>
        )
      })}
    </div>
  )
}
