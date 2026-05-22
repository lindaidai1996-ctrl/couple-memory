'use client'

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

export function LocaleSwitcher() {
  const t = useTranslations('Common')
  const locale = useLocale() as AppLocale
  const router = useRouter()

  function handleChange(nextLocale: AppLocale) {
    if (nextLocale === locale) return
    setLocaleCookie(nextLocale)
    router.refresh()
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
        const active = option === locale
        return (
          <button
            key={option}
            type="button"
            onClick={() => handleChange(option)}
            className={`rounded-full px-2.5 py-1.5 transition-all ${
              active
                ? 'dashboard-pill-active'
                : 'text-warm-text hover:bg-white/50 dark:hover:bg-white/8'
            }`}
          >
            {labelMap[option]}
          </button>
        )
      })}
    </div>
  )
}
