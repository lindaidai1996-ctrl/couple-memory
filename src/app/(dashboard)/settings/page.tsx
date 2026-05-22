'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { VelvetDatePicker } from '@/components/forms/velvet-date-picker'
import { VelvetSelect } from '@/components/forms/velvet-select'
import { SettingsFormSkeleton } from '@/components/skeleton/settings-form-skeleton'
import { compressAndUploadAvatar, type UploadStage } from '@/lib/upload'
import {
  CAPTION_STYLE_OPTIONS,
  normalizeBlockedPhrases,
  normalizeBlockedPhrasesUpdate,
  parseCaptionStylePreferenceUpdate,
  parseTonePreferenceUpdate,
  pickCaptionStylePreference,
  TONE_OPTIONS,
  pickTonePreference,
} from '@/lib/preferences'

type CoverMode = 'NONE' | 'PHOTO' | 'UPLOAD'

interface CoupleData {
  id: string
  name: string
  slug: string
  startDate: string | null
  coverMode: CoverMode
  coverPhotoId: string | null
  coverPhotoUrl: string | null
  bio: string | null
  captionStylePreference: string | null
  tonePreference: string | null
  blockedPhrases: string[]
  isPublic: boolean
  inviteCode: string | null
  inviteExpiresAt: string | null
}

interface UserProfile {
  id: string
  email: string
  name: string | null
  avatar: string | null
}

interface CoverPhotoCandidate {
  id: string
  fileName: string
  status: string
  sortOrder: number | null
  createdAt: string
  thumbnailUrl: string | null
  displayUrl: string | null
}

interface CoverPhotoOption {
  id: string
  fileName: string
  previewUrl: string
  coverUrl: string
}

interface SettingsHeroCardInput {
  isPublic: boolean
  slug: string
  coverMode: CoverMode
  coverPhotoUrl: string | null
  avatar: string | null
  captionStylePreference: string | null
  tonePreference: string | null
  blockedPhrases: string[]
}

interface SettingsHeroCard {
  label: string
  value: string
  detail: string
}

interface MemoryPreferenceSummary {
  styleLabel: string
  toneLabel: string
  blockedCount: number
  hasCustomPreferences: boolean
}

type CoupleUpdateInput = {
  name: string
  slug: string
  startDate: string | null
  bio: string | null
  isPublic: boolean
  coverMode: CoverMode
  coverPhotoId: string | null
  coverPhotoUrl: string | null
  captionStylePreference?: string | null
  tonePreference?: string | null
  blockedPhrases?: string[]
}

export function normalizeCoverModeForSettings(
  coverMode: CoverMode | undefined,
  coverPhotoUrl: string | null
): CoverMode {
  if (coverMode === 'UPLOAD') {
    return coverPhotoUrl ? 'PHOTO' : 'NONE'
  }

  return coverMode ?? 'NONE'
}

function normalizeCoupleResponse(data: Partial<CoupleData> & Record<string, unknown>): CoupleData {
  const coverPhotoUrl = typeof data.coverPhotoUrl === 'string' ? data.coverPhotoUrl : null

  return {
    id: String(data.id ?? ''),
    name: String(data.name ?? ''),
    slug: String(data.slug ?? ''),
    startDate: typeof data.startDate === 'string' ? data.startDate : null,
    coverMode: normalizeCoverModeForSettings(data.coverMode as CoverMode | undefined, coverPhotoUrl),
    coverPhotoId: typeof data.coverPhotoId === 'string' ? data.coverPhotoId : null,
    coverPhotoUrl,
    bio: typeof data.bio === 'string' ? data.bio : null,
    captionStylePreference: pickCaptionStylePreference(
      typeof data.captionStylePreference === 'string' ? data.captionStylePreference : null
    ),
    tonePreference: pickTonePreference(
      typeof data.tonePreference === 'string' ? data.tonePreference : null
    ),
    blockedPhrases: normalizeBlockedPhrases(data.blockedPhrases),
    isPublic: Boolean(data.isPublic),
    inviteCode: typeof data.inviteCode === 'string' ? data.inviteCode : null,
    inviteExpiresAt: typeof data.inviteExpiresAt === 'string' ? data.inviteExpiresAt : null,
  }
}

export function buildAvatarUpdatePayload(avatar: string) {
  const trimmed = avatar.trim()
  return { avatar: trimmed || null }
}

export function buildAvatarInputInitialValue() {
  return ''
}

export function buildBlockedPhrasesDraft(blockedPhrases: string[]) {
  return blockedPhrases.join('\n')
}

export function parseBlockedPhrasesDraft(draft: string) {
  return normalizeBlockedPhrases(draft.split('\n'))
}

export function buildCoupleUpdatePayload(input: CoupleUpdateInput) {
  const normalizedInput: CoupleUpdateInput = { ...input }
  const captionStylePreference = parseCaptionStylePreferenceUpdate(input.captionStylePreference)
  const tonePreference = parseTonePreferenceUpdate(input.tonePreference)
  const blockedPhrases = normalizeBlockedPhrasesUpdate(input.blockedPhrases)

  if (captionStylePreference !== undefined) {
    normalizedInput.captionStylePreference = captionStylePreference
  } else {
    delete normalizedInput.captionStylePreference
  }

  if (tonePreference !== undefined) {
    normalizedInput.tonePreference = tonePreference
  } else {
    delete normalizedInput.tonePreference
  }

  if (blockedPhrases !== undefined) {
    normalizedInput.blockedPhrases = blockedPhrases
  } else {
    delete normalizedInput.blockedPhrases
  }

  if (input.coverMode === 'NONE') {
    return {
      ...normalizedInput,
      coverPhotoId: null,
      coverPhotoUrl: null,
    }
  }

  if (input.coverMode === 'UPLOAD') {
    return {
      ...normalizedInput,
      coverPhotoId: null,
      coverPhotoUrl: input.coverPhotoUrl?.trim() || null,
    }
  }

  return {
    ...normalizedInput,
    coverPhotoId: input.coverPhotoId?.trim() || null,
    coverPhotoUrl: input.coverPhotoUrl?.trim() || null,
  }
}

export function buildPublicPreviewUrl(origin: string, slug: string) {
  const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin
  return `${normalizedOrigin}/s/${slug}`
}

export function buildSettingsHeroCards(input: SettingsHeroCardInput): SettingsHeroCard[] {
  const publicationCard: SettingsHeroCard = input.isPublic && input.slug
    ? {
        label: 'Publication',
        value: 'Live',
        detail: `Slug /s/${input.slug} is available for sharing.`,
      }
    : {
        label: 'Publication',
        value: 'Private',
        detail: 'Public preview is hidden until sharing is enabled.',
      }

  const hasVisualMaterial = Boolean(input.avatar || (input.coverMode === 'PHOTO' && input.coverPhotoUrl))
  const visualMoodValue = hasVisualMaterial ? 'Curated' : 'Draft'
  const visualMoodDetail = hasVisualMaterial
    ? 'Avatar, cover, and tone controls already have visible material.'
    : 'Add an avatar or cover image to establish a stronger visual mood.'

  const blockedCount = input.blockedPhrases.length
  const preferenceLabel = input.captionStylePreference || input.tonePreference || 'default'
  const guardrailValue = blockedCount > 0 ? `${blockedCount} filters` : 'Default'
  const guardrailDetail = blockedCount > 0
    ? `Caption style ${preferenceLabel} with ${blockedCount} blocked phrases.`
    : 'No blocked phrases yet. System defaults are still in use.'

  return [
    publicationCard,
    {
      label: 'Visual Mood',
      value: visualMoodValue,
      detail: visualMoodDetail,
    },
    {
      label: 'AI Guardrails',
      value: guardrailValue,
      detail: guardrailDetail,
    },
  ]
}

export function buildMemoryPreferenceSummary(input: {
  captionStylePreference: string | null
  tonePreference: string | null
  blockedPhrases: string[]
}): MemoryPreferenceSummary {
  return {
    styleLabel: input.captionStylePreference || 'default',
    toneLabel: input.tonePreference || 'default',
    blockedCount: input.blockedPhrases.length,
    hasCustomPreferences: Boolean(
      input.captionStylePreference ||
      input.tonePreference ||
      input.blockedPhrases.length > 0
    ),
  }
}

export function buildResetMemoryPreferencesInput(couple: CoupleData): CoupleData {
  return {
    ...couple,
    captionStylePreference: null,
    tonePreference: null,
    blockedPhrases: [],
  }
}

export function buildRecentCoverPhotoOptions(
  photos: CoverPhotoCandidate[],
  limit = 8
): CoverPhotoOption[] {
  return photos
    .filter(photo => photo.status === 'READY' && Boolean(photo.displayUrl))
    .sort((a, b) => {
      const sortOrderDiff = (b.sortOrder ?? 0) - (a.sortOrder ?? 0)
      if (sortOrderDiff !== 0) return sortOrderDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    .slice(0, limit)
    .map(photo => ({
      id: photo.id,
      fileName: photo.fileName,
      previewUrl: photo.thumbnailUrl || photo.displayUrl || '',
      coverUrl: photo.displayUrl || '',
    }))
}

export function applyCoverPhotoSelection(
  couple: CoupleData,
  option: CoverPhotoOption
): CoupleData {
  return {
    ...couple,
    coverPhotoId: option.id,
    coverPhotoUrl: option.coverUrl,
  }
}

export function extractApiErrorMessage(
  payload: unknown,
  fallback: string
) {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error?: unknown }).error
    if (typeof error === 'string' && error.trim()) {
      return error
    }

    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as { message?: unknown }).message === 'string' &&
      (error as { message: string }).message.trim()
    ) {
      return (error as { message: string }).message
    }
  }

  return fallback
}

function buildAvatarUploadStageLabels(t: ReturnType<typeof useTranslations<'SettingsPage'>>) {
  return {
    compressing: t('avatarUploadCompressing'),
    uploading: t('avatarUploadUploading'),
    confirming: t('avatarUploadConfirming'),
  } satisfies Record<UploadStage, string>
}

export default function SettingsPage() {
  const t = useTranslations('SettingsPage')
  const locale = useLocale()
  const avatarStageLabels = useMemo(() => buildAvatarUploadStageLabels(t), [t])
  const [couple, setCouple] = useState<CoupleData | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [avatarInput, setAvatarInput] = useState('')
  const [blockedPhrasesDraft, setBlockedPhrasesDraft] = useState('')
  const [recentCoverPhotos, setRecentCoverPhotos] = useState<CoverPhotoOption[]>([])
  const [recentCoverPhotosLoading, setRecentCoverPhotosLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarUploadStage, setAvatarUploadStage] = useState<UploadStage | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function fetchSettingsData() {
      const [coupleRes, profileRes] = await Promise.all([
        fetch('/api/couples/mine'),
        fetch('/api/users/me/profile'),
      ])

      if (coupleRes.ok) {
        const data = await coupleRes.json()
        const normalizedCouple = normalizeCoupleResponse(data)
        setCouple(normalizedCouple)
        setBlockedPhrasesDraft(buildBlockedPhrasesDraft(normalizedCouple.blockedPhrases))
      }

      if (profileRes.ok) {
        const data = await profileRes.json()
        setProfile(data)
        setAvatarInput(buildAvatarInputInitialValue())
      }

      setLoading(false)
    }

    fetchSettingsData()
  }, [])

  useEffect(() => {
    if (!couple?.id) return
    const coupleId = couple.id

    let cancelled = false

    async function fetchRecentCoverPhotos() {
      setRecentCoverPhotosLoading(true)

      try {
        const res = await fetch(`/api/couples/${coupleId}/photos?status=READY&sort=desc&limit=12`)
        if (!res.ok) return

        const data = await res.json()
        const nextOptions = buildRecentCoverPhotoOptions(
          Array.isArray(data.photos) ? data.photos as CoverPhotoCandidate[] : [],
          8
        )

        if (!cancelled) {
          setRecentCoverPhotos(nextOptions)
        }
      } finally {
        if (!cancelled) {
          setRecentCoverPhotosLoading(false)
        }
      }
    }

    void fetchRecentCoverPhotos()

    return () => {
      cancelled = true
    }
  }, [couple?.id])

  async function saveAvatar(nextAvatar: string | null) {
    setAvatarSaving(true)
    setMessage(null)

    const res = await fetch('/api/users/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: nextAvatar }),
    })

    if (res.ok) {
      const updated = await res.json()
      setProfile(updated)
      setMessage({ type: 'success', text: t('avatarUpdated') })
    } else {
      const data = await res.json()
      setMessage({
        type: 'error',
        text: extractApiErrorMessage(data, t('avatarFailed')),
      })
    }

    setAvatarSaving(false)
  }

  async function handleAvatarSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!profile) return

    await saveAvatar(buildAvatarUpdatePayload(avatarInput).avatar)
  }

  async function handleAvatarFileChange(file: File | null) {
    if (!file) return

    setAvatarSaving(true)
    setAvatarUploadStage('compressing')
    setMessage(null)

    try {
      const { avatarUrl } = await compressAndUploadAvatar(file, stage => {
        setAvatarUploadStage(stage)
      })
      await saveAvatar(avatarUrl)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('avatarFailed')
      setMessage({ type: 'error', text: errorMessage })
      setAvatarSaving(false)
    } finally {
      setAvatarUploadStage(null)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!couple) return

    setSaving(true)
    setMessage(null)

    const normalizedBlockedPhrases = parseBlockedPhrasesDraft(blockedPhrasesDraft)
    const nextCouple = {
      ...couple,
      blockedPhrases: normalizedBlockedPhrases,
    }

    setCouple(nextCouple)

    const res = await fetch(`/api/couples/${couple.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildCoupleUpdatePayload(nextCouple)),
    })

    if (res.ok) {
      const data = await res.json()
      const normalizedCouple = normalizeCoupleResponse(data)
      setCouple(normalizedCouple)
      setBlockedPhrasesDraft(buildBlockedPhrasesDraft(normalizedCouple.blockedPhrases))
      setMessage({ type: 'success', text: t('saved') })
    } else {
      const data = await res.json()
      setMessage({
        type: 'error',
        text: extractApiErrorMessage(data, t('saveFailed')),
      })
    }

    setSaving(false)
  }

  async function handleGenerateInvite() {
    if (!couple) return

    const res = await fetch(`/api/couples/${couple.id}/invite`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setCouple(prev => prev ? {
        ...prev,
        inviteCode: data.inviteCode,
        inviteExpiresAt: data.inviteExpiresAt,
      } : null)
    }
  }

  async function handleRegenerateInvite() {
    if (!couple) return
    const res = await fetch(`/api/couples/${couple.id}/invite`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setCouple(prev => prev ? {
        ...prev,
        inviteCode: data.inviteCode,
        inviteExpiresAt: data.inviteExpiresAt,
      } : null)
      setMessage({ type: 'success', text: t('inviteRegenerated') })
    }
  }

  async function handleResetMemoryPreferences() {
    if (!couple) return

    setSaving(true)
    setMessage(null)

    const nextCouple = buildResetMemoryPreferencesInput(couple)
    setCouple(nextCouple)
    setBlockedPhrasesDraft('')

    const res = await fetch(`/api/couples/${couple.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildCoupleUpdatePayload(nextCouple)),
    })

    if (res.ok) {
      const data = await res.json()
      const normalizedCouple = normalizeCoupleResponse(data)
      setCouple(normalizedCouple)
      setBlockedPhrasesDraft(buildBlockedPhrasesDraft(normalizedCouple.blockedPhrases))
      setMessage({ type: 'success', text: t('memoryPreferencesReset') })
    } else {
      const data = await res.json()
      setMessage({
        type: 'error',
        text: extractApiErrorMessage(data, t('memoryPreferencesResetFailed')),
      })
    }

    setSaving(false)
  }

  if (loading) {
    return <SettingsFormSkeleton />
  }

  if (!couple) {
    return (
      <div className="text-center py-20">
        <p className="text-warm-muted">{t('notFound')}</p>
      </div>
    )
  }

  const publicPreviewUrl = typeof window !== 'undefined'
    ? buildPublicPreviewUrl(window.location.origin, couple.slug)
    : ''
  const avatarPreviewUrl = avatarInput.trim() || profile?.avatar || ''
  const previewReady = Boolean(couple.isPublic && couple.slug)
  const heroCards = buildSettingsHeroCards({
    isPublic: couple.isPublic,
    slug: couple.slug,
    coverMode: couple.coverMode,
    coverPhotoUrl: couple.coverPhotoUrl,
    avatar: profile?.avatar || avatarInput.trim() || null,
    captionStylePreference: couple.captionStylePreference,
    tonePreference: couple.tonePreference,
    blockedPhrases: couple.blockedPhrases,
  })
  const memoryPreferenceSummary = buildMemoryPreferenceSummary({
    captionStylePreference: couple.captionStylePreference,
    tonePreference: couple.tonePreference,
    blockedPhrases: couple.blockedPhrases,
  })

  return (
    <div className={pageShellClass}>
      <PageHeader
        title={t('title')}
        eyebrow={t('basicInfo')}
        summary={t('visibilityDescription')}
        detail={previewReady ? t('visibilityHintOn') : t('visibilityHintOff')}
        cards={heroCards}
      />

      {message ? (
        <div className={buildMessageBannerClass(message.type)}>
          {message.text}
        </div>
      ) : null}

      <form onSubmit={handleAvatarSubmit}>
        <Section
          title={t('avatar')}
          eyebrow="Portrait"
          description={t('avatarHint')}
          accent={avatarPreviewUrl ? 'plum' : 'rose'}
        >
          <div className="grid gap-5 lg:grid-cols-[132px_minmax(0,1fr)]">
            <div className="flex flex-col items-center gap-3">
              <div className={avatarFrameClass}>
                <div className={avatarHaloClass} />
                <div className={avatarMediaClass}>
                  {avatarPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreviewUrl}
                      alt={t('avatarPreviewAlt')}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="px-4 text-center text-[11px] uppercase tracking-[0.28em] text-[var(--text-soft)]">
                      {t('avatarEmpty')}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-center text-[11px] uppercase tracking-[0.26em] text-[var(--text-faint)]">
                {profile?.name || profile?.email || t('avatar')}
              </p>
            </div>
            <div className="space-y-4">
              <Field label={t('avatarUploadField')} hint={t('avatarUploadHint')}>
                <label className={uploadTileClass}>
                  <span className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-faint)]">
                    Image file
                  </span>
                  <span className="font-[var(--font-display)] text-[20px] text-[var(--text)]">
                    {avatarSaving && avatarUploadStage
                      ? avatarStageLabels[avatarUploadStage]
                      : t('uploadAvatar')}
                  </span>
                  <span className="max-w-sm text-center text-sm leading-6 text-[var(--text-soft)]">
                    {t('avatarUploadHint')}
                  </span>
                  <span className={chipClass}>JPEG / PNG / WEBP / HEIC</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    className="hidden"
                    disabled={avatarSaving}
                    onChange={e => {
                      const file = e.target.files?.[0] ?? null
                      void handleAvatarFileChange(file)
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
              </Field>
              <Field label={t('avatarField')} hint={t('avatarHint')}>
                <input
                  value={avatarInput}
                  onChange={e => setAvatarInput(e.target.value)}
                  className={controlClass}
                  placeholder={t('avatarPlaceholder')}
                />
              </Field>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="submit"
                  disabled={avatarSaving}
                  className={primaryButtonClass}
                >
                  {avatarSaving ? t('saving') : t('updateAvatar')}
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarInput('')}
                  className={secondaryButtonClass}
                >
                  {t('clear')}
                </button>
              </div>
            </div>
          </div>
        </Section>
      </form>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Section
          title={t('basicInfo')}
          eyebrow="Identity"
          description={t('slugHint')}
          accent="plum"
        >
          <Field label={t('name')}>
            <input
              value={couple.name}
              onChange={e => setCouple(prev => prev ? { ...prev, name: e.target.value } : prev)}
              required
              className={controlClass}
              placeholder={t('namePlaceholder')}
            />
          </Field>

          <Field label={t('slug')} hint={t('slugHint')}>
            <input
              value={couple.slug}
              onChange={e => setCouple(prev => prev ? { ...prev, slug: e.target.value } : prev)}
              required
              pattern="^[a-z0-9-]+$"
              className={controlClass}
              placeholder="my-love-story"
            />
          </Field>

          <Field label={t('date')}>
            <VelvetDatePicker
              ariaLabel={t('date')}
              locale={locale}
              value={couple.startDate?.split('T')[0] || ''}
              onChange={value => setCouple(prev => prev ? {
                ...prev,
                startDate: value || null,
              } : prev)}
            />
          </Field>

          <Field label={t('bio')}>
            <textarea
              value={couple.bio || ''}
              onChange={e => setCouple(prev => prev ? { ...prev, bio: e.target.value || null } : prev)}
              rows={3}
              className={textareaClass}
              placeholder={t('bioPlaceholder')}
            />
          </Field>
        </Section>

        <Section
          title={t('visibility')}
          eyebrow="Access"
          description={t('visibilityDescription')}
          accent={couple.isPublic ? 'plum' : 'rose'}
        >
          <label className={checkboxCardClass}>
            <span className="relative mt-0.5 inline-flex">
              <input
                type="checkbox"
                checked={couple.isPublic}
                onChange={e => setCouple(prev => prev ? { ...prev, isPublic: e.target.checked } : prev)}
                className={checkboxInputClass}
              />
              <span className={checkboxVisualClass} aria-hidden="true">
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className={checkboxDotClass}
                >
                  <path
                    d="M3.5 8.25 6.4 11.15 12.5 5.1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </span>
            <span className="space-y-1">
              <span className="block text-sm font-medium text-[var(--text)]">{t('visibilityLabel')}</span>
              <span className="block text-xs leading-5 text-[var(--text-soft)]">
                {t('visibilityDescription')}
              </span>
            </span>
          </label>
        </Section>

        <Section
          title={t('aiPreferencesTitle')}
          eyebrow="Voice"
          description={t('toneHint')}
          accent="rose"
        >
          <div className="mb-5 grid gap-3 rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-faint)]">
                {t('memoryPreferenceStyle')}
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--text)]">
                {memoryPreferenceSummary.styleLabel}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-faint)]">
                {t('memoryPreferenceTone')}
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--text)]">
                {memoryPreferenceSummary.toneLabel}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-faint)]">
                {t('memoryPreferenceBlocked')}
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--text)]">
                {t('memoryPreferenceBlockedCount', { count: memoryPreferenceSummary.blockedCount })}
              </p>
            </div>
          </div>

          <Field
            label={t('captionStyleLabel')}
            hint={t('captionStyleHint')}
          >
            <VelvetSelect
              ariaLabel={t('captionStyleLabel')}
              value={couple.captionStylePreference || ''}
              onChange={value => setCouple(prev => prev ? {
                ...prev,
                captionStylePreference: value || null,
              } : prev)}
              options={[
                { value: '', label: t('useSystemDefault') },
                ...CAPTION_STYLE_OPTIONS.map(option => ({
                  value: option.value,
                  label: t(option.labelKey),
                })),
              ]}
            />
          </Field>

          <Field
            label={t('toneLabel')}
            hint={t('toneHint')}
          >
            <VelvetSelect
              ariaLabel={t('toneLabel')}
              value={couple.tonePreference || ''}
              onChange={value => setCouple(prev => prev ? {
                ...prev,
                tonePreference: value || null,
              } : prev)}
              options={[
                { value: '', label: t('useSystemDefault') },
                ...TONE_OPTIONS.map(option => ({
                  value: option.value,
                  label: t(option.labelKey),
                })),
              ]}
            />
          </Field>

          <Field
            label={t('blockedPhrasesLabel')}
            hint={t('blockedPhrasesHint')}
          >
            <textarea
              value={blockedPhrasesDraft}
              onChange={e => setBlockedPhrasesDraft(e.target.value)}
              onBlur={() => setCouple(prev => prev ? {
                ...prev,
                blockedPhrases: parseBlockedPhrasesDraft(blockedPhrasesDraft),
              } : prev)}
              rows={4}
              className={textareaClass}
              placeholder={t('blockedPhrasesPlaceholder')}
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[var(--line)] bg-[var(--panel-strong)]/75 px-4 py-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--text)]">{t('memoryPreferenceResetTitle')}</p>
              <p className="text-xs leading-5 text-[var(--text-soft)]">
                {memoryPreferenceSummary.hasCustomPreferences
                  ? t('memoryPreferenceResetHint')
                  : t('memoryPreferenceResetEmptyHint')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleResetMemoryPreferences()}
              disabled={saving || !memoryPreferenceSummary.hasCustomPreferences}
              className={secondaryButtonClass}
            >
              {t('memoryPreferenceResetAction')}
            </button>
          </div>
        </Section>

        <Section
          title={t('cover')}
          eyebrow="Image"
          description={t('coverRecentPhotosHint')}
          accent="plum"
        >
          <Field label={t('coverSource')}>
            <VelvetSelect
              ariaLabel={t('coverSource')}
              value={couple.coverMode}
              onChange={value => setCouple(prev => prev ? {
                ...prev,
                coverMode: value as CoverMode,
              } : prev)}
              options={[
                { value: 'NONE', label: t('coverNone') },
                { value: 'PHOTO', label: t('coverPhoto') },
              ]}
            />
          </Field>

          {couple.coverMode === 'PHOTO' ? (
            <Field label={t('coverRecentPhotos')} hint={t('coverRecentPhotosHint')}>
              {recentCoverPhotosLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="aspect-square rounded-[24px] border border-[var(--line)] bg-[var(--panel-strong)]/75 animate-pulse"
                    />
                  ))}
                </div>
              ) : recentCoverPhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {recentCoverPhotos.map(photo => {
                    const selected = couple.coverPhotoId === photo.id

                    return (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setCouple(prev => prev ? applyCoverPhotoSelection(prev, photo) : prev)}
                        className={buildCoverTileClass(selected)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.previewUrl}
                          alt={photo.fileName}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                        {selected ? (
                          <div className={coverSelectedBadgeClass}>
                            {t('coverSelected')}
                          </div>
                        ) : null}
                        <div className={coverTileCaptionClass}>
                          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-white/92">
                            {photo.fileName}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className={emptyStateClass}>
                  {t('coverRecentPhotosEmpty')}
                </div>
              )}
            </Field>
          ) : null}
        </Section>

        <Section
          title={t('publicPreview')}
          eyebrow="Preview"
          description={previewReady ? t('visibilityHintOn') : t('visibilityHintOff')}
          accent={previewReady ? 'plum' : 'rose'}
        >
          <Field label={t('publicPreviewUrl')}>
            <input value={publicPreviewUrl} readOnly className={readOnlyControlClass} />
          </Field>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={!couple.isPublic || !couple.slug}
              onClick={() => window.open(publicPreviewUrl, '_blank', 'noopener,noreferrer')}
              className={secondaryButtonClass}
            >
              {t('openPreview')}
            </button>
            <button
              type="button"
              disabled={!couple.slug}
              onClick={() => {
                navigator.clipboard.writeText(publicPreviewUrl)
                setMessage({ type: 'success', text: t('copiedPreview') })
              }}
              className={ghostButtonClass}
            >
              {t('copyPreview')}
            </button>
          </div>

          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-faint)]">
            {previewReady ? t('visibilityHintOn') : t('visibilityHintOff')}
          </p>
        </Section>

        <button
          type="submit"
          disabled={saving}
          className={primaryButtonClass}
        >
          {saving ? t('saving') : t('save')}
        </button>
      </form>

      <div className="border-t border-[var(--line)]/80 pt-5">
        <Section
          title={t('invite')}
          eyebrow="Circle"
          description={t('inviteRegenerateConfirm')}
          accent="rose"
        >
          <InviteSection couple={couple} onGenerate={handleGenerateInvite} onRegenerate={handleRegenerateInvite} />
        </Section>
      </div>
    </div>
  )
}

const pageShellClass = `mx-auto flex max-w-4xl flex-col gap-4 text-[var(--text)]
  [--line:var(--color-warm-border)] [--text:var(--color-warm-text)] [--text-soft:var(--color-warm-muted)]
  [--text-faint:var(--dashboard-text-faint)] [--panel:var(--color-warm-sidebar)]
  [--panel-strong:var(--color-warm-surface)] [--accent:var(--color-warm-accent)]
  [--accent-2:var(--dashboard-accent-secondary)] [--accent-glow:var(--dashboard-accent-glow)]`

const heroClass = `dashboard-hero-surface relative overflow-hidden rounded-[30px] px-5 py-5 text-white sm:px-6`

const sectionClass = `dashboard-surface-card-soft rounded-[26px] p-5 backdrop-blur-sm`

const sectionGlowClass = `dashboard-hairline pointer-events-none absolute inset-x-6 top-0 h-px`

const controlClass = `h-10 w-full rounded-[16px] border border-[var(--line)] bg-[var(--panel-strong)] px-3.5 text-sm text-[var(--text)]
  shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] outline-none transition duration-200
  placeholder:text-[var(--text-faint)] hover:border-[rgba(111,79,102,0.28)]
  focus:border-[rgba(111,79,102,0.42)] focus:ring-4 focus:ring-[rgba(111,79,102,0.12)]`

const textareaClass = `${controlClass} h-auto min-h-[108px] py-3 leading-6 resize-none`

const readOnlyControlClass = `${controlClass} bg-[var(--dashboard-surface-gradient)] text-[var(--text-soft)]`

const primaryButtonClass = `inline-flex h-10 items-center justify-center rounded-[16px] border border-white/20
  bg-[linear-gradient(135deg,#5b3a52_0%,#c9a2a1_100%)] px-4 text-sm font-medium text-white
  shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_24px_rgba(111,79,102,0.22)]
  transition duration-200 hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_14px_28px_rgba(111,79,102,0.26)]
  disabled:translate-y-0 disabled:opacity-50`

const secondaryButtonClass = `dashboard-glass-button inline-flex h-10 items-center justify-center rounded-[16px]
  px-4 text-sm font-medium text-[var(--accent)] transition duration-200
  hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50`

const ghostButtonClass = `inline-flex h-10 items-center justify-center rounded-[16px] border border-[var(--line)]
  bg-transparent px-4 text-sm font-medium text-[var(--text)] transition duration-200
  hover:-translate-y-0.5 hover:bg-white/65 dark:hover:bg-white/8 disabled:translate-y-0 disabled:opacity-50`

const chipClass = `inline-flex rounded-full border border-[rgba(111,79,102,0.16)] bg-white/72 px-2.5 py-1 text-[10px]
  uppercase tracking-[0.22em] text-[rgba(91,58,82,0.88)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]`

const avatarFrameClass = `relative flex h-28 w-28 items-center justify-center`
const avatarHaloClass = `absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.12)_56%,transparent_70%)] blur-sm`
const avatarMediaClass = `relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/50
  bg-[linear-gradient(135deg,rgba(111,79,102,0.18),rgba(201,162,161,0.26))] shadow-[0_18px_36px_rgba(73,42,58,0.16)]`

const uploadTileClass = `group flex min-h-[168px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px]
  border border-dashed border-[rgba(111,79,102,0.28)] bg-[linear-gradient(135deg,rgba(111,79,102,0.08),rgba(201,162,161,0.14))]
  px-5 py-5 text-center transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(111,79,102,0.44)]`

const checkboxCardClass = `flex cursor-pointer items-start gap-3 rounded-[20px] border border-[var(--line)]
  bg-[linear-gradient(135deg,rgba(111,79,102,0.06),rgba(201,162,161,0.1))] px-4 py-3`

const checkboxInputClass = `peer absolute inset-0 z-10 cursor-pointer opacity-0`
const checkboxVisualClass = `flex h-5 w-5 items-center justify-center rounded-[7px] border border-[rgba(111,79,102,0.3)]
  bg-white/70 transition duration-200 peer-checked:border-[var(--accent)] peer-checked:bg-[linear-gradient(135deg,#5b3a52_0%,#c9a2a1_100%)]
  text-transparent peer-checked:text-white peer-focus:ring-4 peer-focus:ring-[rgba(111,79,102,0.12)]`
const checkboxDotClass = `h-3.5 w-3.5 transition duration-200`

const coverSelectedBadgeClass = `absolute left-2 top-2 rounded-full border border-white/20 bg-[linear-gradient(135deg,#5b3a52_0%,#c9a2a1_100%)]
  px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white shadow-[0_10px_20px_rgba(48,24,36,0.22)]`

const coverTileCaptionClass = `absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(18,10,14,0.76))] p-2.5`

const emptyStateClass = `dashboard-empty-surface rounded-[22px] px-4 py-8 text-sm text-[var(--text-soft)]`

function buildMessageBannerClass(type: 'success' | 'error') {
  return `rounded-[20px] border px-4 py-3 text-sm shadow-[0_10px_30px_rgba(40,24,34,0.06)] ${
    type === 'success'
      ? 'border-[rgba(111,79,102,0.16)] bg-[linear-gradient(135deg,rgba(111,79,102,0.09),rgba(201,162,161,0.14))] text-[var(--text)]'
      : 'border-[rgba(166,79,98,0.16)] bg-[linear-gradient(135deg,rgba(122,45,62,0.08),rgba(201,162,161,0.12))] text-[var(--text)]'
  }`
}

function buildCoverTileClass(selected: boolean) {
  return `group relative aspect-square overflow-hidden rounded-[24px] border transition duration-200 ${
    selected
      ? 'border-[rgba(111,79,102,0.42)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_16px_30px_rgba(111,79,102,0.18)] ring-4 ring-[rgba(111,79,102,0.12)]'
      : 'border-[var(--line)] hover:-translate-y-0.5 hover:border-[rgba(111,79,102,0.28)] hover:shadow-[0_14px_26px_rgba(40,24,34,0.08)]'
  }`
}

function PageHeader({
  title,
  eyebrow,
  summary,
  detail,
  cards,
}: {
  title: string
  eyebrow: string
  summary: string
  detail: string
  cards: SettingsHeroCard[]
}) {
  return (
    <header className={heroClass}>
      <div className="absolute inset-y-0 right-0 w-44 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.34),transparent_68%)]" />
      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
        <div className="space-y-4">
          <p className="text-[11px] uppercase tracking-[0.34em] text-white/72">{eyebrow}</p>
          <h1 className="max-w-xl font-[var(--font-display)] text-[clamp(2rem,4vw,3.6rem)] leading-[0.96] tracking-[-0.03em] text-white">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-white/78">{summary}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {cards.map(card => (
              <div
                key={card.label}
                className="rounded-[20px] border border-white/12 bg-white/8 p-3 backdrop-blur-sm"
              >
                <p className="text-[10px] uppercase tracking-[0.26em] text-white/56">{card.label}</p>
                <p className="mt-2 font-[var(--font-display)] text-[22px] leading-none text-white">{card.value}</p>
                <p className="mt-2 text-xs leading-5 text-white/72">{card.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/62">Public status</p>
          <p className="mt-3 font-[var(--font-display)] text-[22px] leading-tight text-white">{detail}</p>
        </div>
      </div>
    </header>
  )
}

function Section({
  title,
  eyebrow,
  description,
  accent,
  children,
}: {
  title: string
  eyebrow?: string
  description?: string
  accent?: 'plum' | 'rose'
  children: React.ReactNode
}) {
  return (
    <section className={`${sectionClass} relative overflow-hidden`}>
      <div
        className={`pointer-events-none absolute inset-0 ${
          accent === 'rose'
            ? 'bg-[radial-gradient(circle_at_86%_28%,rgba(201,162,161,0.12),transparent_42%),radial-gradient(circle_at_14%_100%,rgba(201,162,161,0.04),transparent_28%)]'
            : 'bg-[radial-gradient(circle_at_86%_28%,rgba(111,79,102,0.1),transparent_40%),radial-gradient(circle_at_14%_100%,rgba(111,79,102,0.035),transparent_26%)]'
        }`}
      />
      <div className={sectionGlowClass} />
      <div className="relative space-y-4">
        <div className="flex flex-col gap-2 border-b border-[var(--line)]/80 pb-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            {eyebrow ? (
              <p className="text-[10px] uppercase tracking-[0.34em] text-[var(--text-faint)]">{eyebrow}</p>
            ) : null}
            <h2 className="font-[var(--font-display)] text-[26px] leading-none tracking-[-0.02em] text-[var(--text)]">{title}</h2>
          </div>
          {description ? (
            <p className="max-w-md text-xs leading-5 text-[var(--text-soft)]">{description}</p>
          ) : null}
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <label className="block text-[11px] font-medium uppercase tracking-[0.26em] text-[var(--text-soft)]">
          {label}
        </label>
        {hint ? <p className="text-xs leading-5 text-[var(--text-faint)]">{hint}</p> : null}
      </div>
      {children}
    </div>
  )
}

function InviteSection({
  couple,
  onGenerate,
  onRegenerate,
}: {
  couple: CoupleData
  onGenerate: () => void
  onRegenerate: () => void
}) {
  const t = useTranslations('SettingsPage')
  const [copied, setCopied] = useState(false)

  const daysLeft = useMemo(() => {
    if (!couple.inviteExpiresAt) return null
    const expiresAt = new Date(couple.inviteExpiresAt)
    return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  }, [couple.inviteExpiresAt])

  function handleCopy() {
    const url = `${window.location.origin}/invite/${couple.inviteCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleRegenerate() {
    if (!confirm(t('inviteRegenerateConfirm'))) return
    onRegenerate()
  }

  if (!couple.inviteCode) {
    return (
      <div className="rounded-[24px] border border-dashed border-[rgba(111,79,102,0.24)] bg-[linear-gradient(135deg,rgba(111,79,102,0.05),rgba(201,162,161,0.12))] p-4">
        <p className="mb-3 text-sm leading-6 text-[var(--text-soft)]">{t('visibilityDescription')}</p>
        <button
          type="button"
          onClick={onGenerate}
          className={primaryButtonClass}
        >
          {t('inviteGenerate')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(111,79,102,0.08),rgba(201,162,161,0.14))] p-4">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-faint)]">{t('invite')}</p>
        <code className="mt-3 block break-all rounded-[18px] border border-white/45 bg-white/70 px-3 py-3 text-sm leading-6 text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
          {typeof window !== 'undefined' ? window.location.origin : ''}/invite/{couple.inviteCode}
        </code>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleCopy}
            className={secondaryButtonClass}
          >
            {copied ? t('inviteCopied') : t('inviteCopy')}
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            className={ghostButtonClass}
          >
            {t('inviteRegenerate')}
          </button>
        </div>
      </div>
      {daysLeft !== null && (
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-faint)]">
          {t('inviteExpires', { days: daysLeft })}
        </p>
      )}
    </div>
  )
}
