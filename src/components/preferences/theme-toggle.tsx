'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  DEFAULT_THEME,
  THEME_COOKIE_NAME,
  type ThemeMode,
  pickThemeMode,
} from '@/lib/preferences'

const cycleOrder: ThemeMode[] = ['light', 'dark', 'system']

function readThemePreference() {
  if (typeof document === 'undefined') {
    return DEFAULT_THEME
  }

  const cookieEntry = document.cookie
    .split('; ')
    .find(entry => entry.startsWith(`${THEME_COOKIE_NAME}=`))

  return pickThemeMode(cookieEntry?.split('=').slice(1).join('='))
}

function setThemeCookie(value: ThemeMode) {
  document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`
}

function applyResolvedTheme(theme: ThemeMode) {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme

  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.documentElement.dataset.theme = resolved
}

export function ThemeToggle() {
  const t = useTranslations('Common')
  const [theme, setTheme] = useState<ThemeMode>(readThemePreference)

  useEffect(() => {
    applyResolvedTheme(theme)
  }, [theme])

  const nextTheme = cycleOrder[(cycleOrder.indexOf(theme) + 1) % cycleOrder.length]

  function handleClick() {
    setTheme(nextTheme)
    setThemeCookie(nextTheme)
    applyResolvedTheme(nextTheme)
  }

  const labelMap: Record<ThemeMode, string> = {
    light: t('themeLight'),
    dark: t('themeDark'),
    system: t('themeSystem'),
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-full border border-warm-border bg-warm-surface/90 px-3 py-2 text-xs font-medium text-warm-text shadow-sm backdrop-blur transition-colors hover:bg-warm-bg"
      aria-label={`${t('themeLabel')}: ${labelMap[theme]}`}
      title={`${t('themeLabel')}: ${labelMap[theme]}`}
    >
      <ThemeIcon theme={theme} />
      <span>{labelMap[theme]}</span>
    </button>
  )
}

function ThemeIcon({ theme }: { theme: ThemeMode }) {
  if (theme === 'dark') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3c0 4.97 4.03 9 9 9 .27 0 .53-.01.79-.21z" />
      </svg>
    )
  }

  if (theme === 'light') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    )
  }

  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 18v2" />
    </svg>
  )
}
