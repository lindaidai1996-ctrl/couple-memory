export const THEME_COOKIE_NAME = 'cm-theme'
export const LOCALE_COOKIE_NAME = 'cm-locale'

export const SUPPORTED_THEMES = ['light', 'dark', 'system'] as const
export const SUPPORTED_LOCALES = ['zh-CN', 'en'] as const
export const CAPTION_STYLE_OPTIONS = [
  {
    value: 'romantic',
    labelKey: 'captionStyleRomantic',
  },
  {
    value: 'poetic',
    labelKey: 'captionStylePoetic',
  },
  {
    value: 'diary',
    labelKey: 'captionStyleDiary',
  },
  {
    value: 'photography-note',
    labelKey: 'captionStylePhotographyNote',
  },
] as const
export const TONE_OPTIONS = [
  {
    value: 'warm',
    labelKey: 'toneWarm',
  },
  {
    value: 'gentle',
    labelKey: 'toneGentle',
  },
  {
    value: 'witty',
    labelKey: 'toneWitty',
  },
  {
    value: 'poetic',
    labelKey: 'tonePoetic',
  },
] as const

export type ThemeMode = (typeof SUPPORTED_THEMES)[number]
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]
export type CaptionStylePreference = (typeof CAPTION_STYLE_OPTIONS)[number]['value']
export type TonePreference = (typeof TONE_OPTIONS)[number]['value']

export const DEFAULT_THEME: ThemeMode = 'system'
export const DEFAULT_LOCALE: AppLocale = 'zh-CN'

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return SUPPORTED_THEMES.includes(value as ThemeMode)
}

export function isLocale(value: string | null | undefined): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale)
}

export function isCaptionStylePreference(value: string | null | undefined): value is CaptionStylePreference {
  return CAPTION_STYLE_OPTIONS.some(option => option.value === value)
}

export function isTonePreference(value: string | null | undefined): value is TonePreference {
  return TONE_OPTIONS.some(option => option.value === value)
}

export function pickThemeMode(value: string | null | undefined): ThemeMode {
  return isThemeMode(value) ? value : DEFAULT_THEME
}

export function pickCaptionStylePreference(
  value: string | null | undefined
): CaptionStylePreference | null {
  return isCaptionStylePreference(value) ? value : null
}

export function pickTonePreference(value: string | null | undefined): TonePreference | null {
  return isTonePreference(value) ? value : null
}

export function normalizeBlockedPhrases(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((phrase): phrase is string => typeof phrase === 'string')
    .map(phrase => phrase.trim())
    .filter(Boolean)
}

export function parseCaptionStylePreferenceUpdate(
  value: unknown
): CaptionStylePreference | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  return isCaptionStylePreference(trimmed) ? trimmed : undefined
}

export function parseTonePreferenceUpdate(
  value: unknown
): TonePreference | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  return isTonePreference(trimmed) ? trimmed : undefined
}

export function normalizeBlockedPhrasesUpdate(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value) || value.some(phrase => typeof phrase !== 'string')) {
    return undefined
  }

  return normalizeBlockedPhrases(value)
}

export function resolveThemeMode(theme: ThemeMode, prefersDark: boolean): Exclude<ThemeMode, 'system'> {
  if (theme === 'system') {
    return prefersDark ? 'dark' : 'light'
  }

  return theme
}

export function getNextThemeMode(theme: ThemeMode, prefersDark: boolean): ThemeMode {
  if (theme === 'system') {
    return resolveThemeMode(theme, prefersDark) === 'dark' ? 'light' : 'dark'
  }

  if (theme === 'dark') {
    return 'light'
  }

  return 'system'
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
