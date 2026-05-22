'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import {
  DEFAULT_THEME,
  resolveThemeMode,
  THEME_COOKIE_NAME,
  type ThemeMode,
  pickThemeMode,
} from '@/lib/preferences'

const THEME_CHANGE_EVENT = 'cm-theme-change'

function readThemePreference() {
  if (typeof document === 'undefined') {
    return DEFAULT_THEME
  }

  const cookieEntry = document.cookie
    .split('; ')
    .find(entry => entry.startsWith(`${THEME_COOKIE_NAME}=`))

  return pickThemeMode(cookieEntry?.split('=').slice(1).join('='))
}

function readResolvedTheme() {
  if (typeof document === 'undefined') {
    return null
  }

  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function subscribeToThemePreference(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange)
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange)
}

function setThemeCookie(value: Exclude<ThemeMode, 'system'>) {
  document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`
}

function applyResolvedTheme(theme: ThemeMode) {
  const resolved = resolveThemeMode(
    theme,
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.documentElement.dataset.theme = resolved
}

export function AuthThemeSwitcher() {
  const t = useTranslations('Common')
  const theme = useSyncExternalStore(
    subscribeToThemePreference,
    readThemePreference,
    () => DEFAULT_THEME
  )
  const resolvedTheme = useSyncExternalStore(
    subscribeToThemePreference,
    readResolvedTheme,
    () => null
  )

  useEffect(() => {
    applyResolvedTheme(theme)
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
  }, [theme])

  function handleThemeChange(nextTheme: 'light' | 'dark') {
    const currentResolvedTheme = resolvedTheme
      ?? (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

    if (currentResolvedTheme === nextTheme && theme !== 'system') {
      return
    }

    setThemeCookie(nextTheme)
    applyResolvedTheme(nextTheme)
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-warm-border bg-white/8 p-1 backdrop-blur-md dark:bg-white/4"
      aria-label={t('themeLabel')}
    >
      <button
        type="button"
        onClick={() => handleThemeChange('light')}
        className={`rounded-full px-2.5 py-1.5 text-[10px] transition-all ${
          resolvedTheme === 'light'
            ? 'dashboard-pill-active text-[#20171c] dark:text-[#fffafc]'
            : 'text-warm-text hover:bg-white/50 dark:hover:bg-white/8'
        }`}
      >
        {t('themeLight')}
      </button>
      <button
        type="button"
        onClick={() => handleThemeChange('dark')}
        className={`rounded-full px-2.5 py-1.5 text-[10px] transition-all ${
          resolvedTheme === 'dark'
            ? 'dashboard-pill-active text-[#fffafc]'
            : 'text-warm-text hover:bg-white/50 dark:hover:bg-white/8'
        }`}
      >
        {t('themeDark')}
      </button>
    </div>
  )
}
