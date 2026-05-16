export const THEME_COOKIE_NAME = 'cm-theme'
export const LOCALE_COOKIE_NAME = 'cm-locale'

export const SUPPORTED_THEMES = ['light', 'dark', 'system'] as const
export const SUPPORTED_LOCALES = ['zh-CN', 'en'] as const

export type ThemeMode = (typeof SUPPORTED_THEMES)[number]
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_THEME: ThemeMode = 'system'
export const DEFAULT_LOCALE: AppLocale = 'zh-CN'

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return SUPPORTED_THEMES.includes(value as ThemeMode)
}

export function isLocale(value: string | null | undefined): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale)
}

export function pickThemeMode(value: string | null | undefined): ThemeMode {
  return isThemeMode(value) ? value : DEFAULT_THEME
}

export function normalizeLocaleTag(value: string) {
  return value.toLowerCase()
}

export function pickLocale(
  cookieLocale: string | null | undefined,
  acceptLanguage: string | null | undefined
): AppLocale {
  if (isLocale(cookieLocale)) {
    return cookieLocale
  }

  if (!acceptLanguage) {
    return DEFAULT_LOCALE
  }

  const acceptedTags = acceptLanguage
    .split(',')
    .map(part => part.split(';')[0]?.trim())
    .filter(Boolean)
    .map(normalizeLocaleTag)

  for (const acceptedTag of acceptedTags) {
    const exact = SUPPORTED_LOCALES.find(locale => normalizeLocaleTag(locale) === acceptedTag)
    if (exact) {
      return exact
    }

    const language = acceptedTag.split('-')[0]
    if (language === 'zh') {
      return 'zh-CN'
    }
    if (language === 'en') {
      return 'en'
    }
  }

  return DEFAULT_LOCALE
}
