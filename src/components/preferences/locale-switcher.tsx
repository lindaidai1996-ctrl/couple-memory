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

export function buildLocaleSwitcherClassName() {
  return 'inline-flex h-9 items-center rounded-full border border-warm-border bg-white/24 p-1 text-xs shadow-sm backdrop-blur dark:bg-white/3'
}

export function buildLocaleSwitcherOptionClassName(active: boolean) {
  return `inline-flex min-w-[3.5rem] items-center justify-center rounded-full border px-2.5 py-1.5 text-xs font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none ${
    active
      ? 'dashboard-pill-active'
      : 'border-transparent text-warm-text hover:bg-white/24 dark:hover:bg-white/6'
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
      className={buildLocaleSwitcherClassName()}
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
