'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { SettingsFormSkeleton } from '@/components/skeleton/settings-form-skeleton'
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

function normalizeCoupleResponse(data: Partial<CoupleData> & Record<string, unknown>): CoupleData {
  return {
    id: String(data.id ?? ''),
    name: String(data.name ?? ''),
    slug: String(data.slug ?? ''),
    startDate: typeof data.startDate === 'string' ? data.startDate : null,
    coverMode: (data.coverMode as CoverMode | undefined) ?? 'NONE',
    coverPhotoId: typeof data.coverPhotoId === 'string' ? data.coverPhotoId : null,
    coverPhotoUrl: typeof data.coverPhotoUrl === 'string' ? data.coverPhotoUrl : null,
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

export default function SettingsPage() {
  const t = useTranslations('SettingsPage')
  const [couple, setCouple] = useState<CoupleData | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [avatarInput, setAvatarInput] = useState('')
  const [blockedPhrasesDraft, setBlockedPhrasesDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarSaving, setAvatarSaving] = useState(false)
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
        setAvatarInput(data.avatar ?? '')
      }

      setLoading(false)
    }

    fetchSettingsData()
  }, [])

  async function handleAvatarSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!profile) return

    setAvatarSaving(true)
    setMessage(null)

    const res = await fetch('/api/users/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildAvatarUpdatePayload(avatarInput)),
    })

    if (res.ok) {
      const updated = await res.json()
      setProfile(updated)
      setAvatarInput(updated.avatar ?? '')
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

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-warm-text mb-6">{t('title')}</h1>

      {message && (
        <div className={`mb-6 p-3 rounded-[var(--radius-md)] text-sm ${
          message.type === 'success'
            ? 'bg-green-50 text-success'
            : 'bg-red-50 text-error'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleAvatarSubmit} className="mb-6">
        <Section title={t('avatar')}>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-20 h-20 shrink-0 rounded-full overflow-hidden border border-warm-border bg-warm-bg flex items-center justify-center">
              {avatarPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreviewUrl}
                  alt={t('avatarPreviewAlt')}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-warm-muted text-center px-2">{t('avatarEmpty')}</span>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <Field label={t('avatarField')} hint={t('avatarHint')}>
                <input
                  value={avatarInput}
                  onChange={e => setAvatarInput(e.target.value)}
                  className={inputClass}
                  placeholder={t('avatarPlaceholder')}
                />
              </Field>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={avatarSaving}
                  className="px-4 py-2 text-sm bg-warm-accent text-white rounded-[var(--radius-md)]
                    hover:bg-warm-accent-hover disabled:opacity-50 transition-colors"
                >
                  {avatarSaving ? t('saving') : t('updateAvatar')}
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarInput('')}
                  className="px-4 py-2 text-sm border border-warm-border text-warm-text
                    rounded-[var(--radius-md)] hover:bg-warm-bg transition-colors"
                >
                  {t('clear')}
                </button>
              </div>
            </div>
          </div>
        </Section>
      </form>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title={t('basicInfo')}>
          <Field label={t('name')}>
            <input
              value={couple.name}
              onChange={e => setCouple(prev => prev ? { ...prev, name: e.target.value } : prev)}
              required
              className={inputClass}
              placeholder={t('namePlaceholder')}
            />
          </Field>

          <Field label={t('slug')} hint={t('slugHint')}>
            <input
              value={couple.slug}
              onChange={e => setCouple(prev => prev ? { ...prev, slug: e.target.value } : prev)}
              required
              pattern="^[a-z0-9-]+$"
              className={inputClass}
              placeholder="my-love-story"
            />
          </Field>

          <Field label={t('date')}>
            <input
              type="date"
              value={couple.startDate?.split('T')[0] || ''}
              onChange={e => setCouple(prev => prev ? {
                ...prev,
                startDate: e.target.value || null,
              } : prev)}
              className={inputClass}
            />
          </Field>

          <Field label={t('bio')}>
            <textarea
              value={couple.bio || ''}
              onChange={e => setCouple(prev => prev ? { ...prev, bio: e.target.value || null } : prev)}
              rows={3}
              className={inputClass + ' resize-none'}
              placeholder={t('bioPlaceholder')}
            />
          </Field>
        </Section>

        <Section title={t('visibility')}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={couple.isPublic}
              onChange={e => setCouple(prev => prev ? { ...prev, isPublic: e.target.checked } : prev)}
              className="w-5 h-5 rounded border-warm-border text-warm-accent
                focus:ring-warm-accent/30 cursor-pointer"
            />
            <span className="text-sm text-warm-text">{t('visibilityLabel')}</span>
          </label>
          <p className="text-xs text-warm-muted mt-1 ml-8">
            {t('visibilityDescription')}
          </p>
        </Section>

        <Section title={t('aiPreferencesTitle')}>
          <Field
            label={t('captionStyleLabel')}
            hint={t('captionStyleHint')}
          >
            <select
              value={couple.captionStylePreference || ''}
              onChange={e => setCouple(prev => prev ? {
                ...prev,
                captionStylePreference: e.target.value || null,
              } : prev)}
              className={inputClass}
            >
              <option value="">{t('useSystemDefault')}</option>
              {CAPTION_STYLE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
              ))}
            </select>
          </Field>

          <Field
            label={t('toneLabel')}
            hint={t('toneHint')}
          >
            <select
              value={couple.tonePreference || ''}
              onChange={e => setCouple(prev => prev ? {
                ...prev,
                tonePreference: e.target.value || null,
              } : prev)}
              className={inputClass}
            >
              <option value="">{t('useSystemDefault')}</option>
              {TONE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
              ))}
            </select>
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
              className={inputClass + ' resize-none'}
              placeholder={t('blockedPhrasesPlaceholder')}
            />
          </Field>
        </Section>

        <Section title={t('cover')}>
          <Field label={t('coverSource')}>
            <select
              value={couple.coverMode}
              onChange={e => setCouple(prev => prev ? {
                ...prev,
                coverMode: e.target.value as CoverMode,
              } : prev)}
              className={inputClass}
            >
              <option value="NONE">{t('coverNone')}</option>
              <option value="PHOTO">{t('coverPhoto')}</option>
              <option value="UPLOAD">{t('coverUpload')}</option>
            </select>
          </Field>

          {couple.coverMode === 'PHOTO' && (
            <>
              <Field label={t('coverPhotoId')} hint={t('coverPhotoIdHint')}>
                <input
                  value={couple.coverPhotoId || ''}
                  onChange={e => setCouple(prev => prev ? {
                    ...prev,
                    coverPhotoId: e.target.value || null,
                  } : prev)}
                  className={inputClass}
                  placeholder="photo_123"
                />
              </Field>
              <Field label={t('coverPreviewUrl')} hint={t('coverPreviewUrlHint')}>
                <input
                  value={couple.coverPhotoUrl || ''}
                  onChange={e => setCouple(prev => prev ? {
                    ...prev,
                    coverPhotoUrl: e.target.value || null,
                  } : prev)}
                  className={inputClass}
                  placeholder="https://cdn.example.com/cover.jpg"
                />
              </Field>
            </>
          )}

          {couple.coverMode === 'UPLOAD' && (
            <Field label={t('coverUploadUrl')} hint={t('coverUploadUrlHint')}>
              <input
                value={couple.coverPhotoUrl || ''}
                onChange={e => setCouple(prev => prev ? {
                  ...prev,
                  coverPhotoUrl: e.target.value || null,
                } : prev)}
                className={inputClass}
                placeholder="https://cdn.example.com/cover.jpg"
              />
            </Field>
          )}

          {couple.coverMode !== 'NONE' && (
            <div className="rounded-[var(--radius-md)] border border-warm-border overflow-hidden bg-warm-bg">
              {couple.coverPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={couple.coverPhotoUrl}
                  alt={t('coverPreviewAlt')}
                  className="w-full h-44 object-cover"
                />
              ) : (
                <div className="h-44 flex items-center justify-center text-sm text-warm-muted">
                  {t('coverPreviewEmpty')}
                </div>
              )}
            </div>
          )}
        </Section>

        <Section title={t('publicPreview')}>
          <Field label={t('publicPreviewUrl')}>
            <input value={publicPreviewUrl} readOnly className={inputClass} />
          </Field>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!couple.isPublic || !couple.slug}
              onClick={() => window.open(publicPreviewUrl, '_blank', 'noopener,noreferrer')}
              className="px-4 py-2 text-sm border border-warm-accent text-warm-accent
                rounded-[var(--radius-md)] hover:bg-warm-accent/10 disabled:opacity-50
                disabled:hover:bg-transparent transition-colors"
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
              className="px-4 py-2 text-sm border border-warm-border text-warm-text
                rounded-[var(--radius-md)] hover:bg-warm-bg disabled:opacity-50 transition-colors"
            >
              {t('copyPreview')}
            </button>
          </div>

          <p className="text-xs text-warm-muted">
            {!couple.isPublic
              ? t('visibilityHintOff')
              : t('visibilityHintOn')}
          </p>
        </Section>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-warm-accent text-white rounded-[var(--radius-md)] font-medium
            hover:bg-warm-accent-hover disabled:opacity-50 transition-colors"
        >
          {saving ? t('saving') : t('save')}
        </button>
      </form>

      <div className="mt-10 pt-8 border-t border-warm-border">
        <Section title={t('invite')}>
          <InviteSection couple={couple} onGenerate={handleGenerateInvite} onRegenerate={handleRegenerateInvite} />
        </Section>
      </div>
    </div>
  )
}

const inputClass = `w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-warm-border
  bg-warm-bg text-warm-text placeholder:text-warm-muted/60
  focus:ring-2 focus:ring-warm-accent/30 focus:border-warm-accent outline-none
  transition-all duration-200 text-sm`

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-warm-surface rounded-[var(--radius-lg)] p-5 border border-warm-border space-y-4">
      <h2 className="text-base font-semibold text-warm-text">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-warm-text mb-1.5">{label}</label>
      {hint && <p className="text-xs text-warm-muted mb-1.5">{hint}</p>}
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
      <button
        type="button"
        onClick={onGenerate}
        className="px-4 py-2 text-sm text-warm-accent border border-warm-accent
          rounded-[var(--radius-md)] hover:bg-warm-accent/10 transition-colors"
      >
        {t('inviteGenerate')}
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 bg-warm-bg rounded-[var(--radius-sm)] text-sm text-warm-text border border-warm-border break-all">
          {typeof window !== 'undefined' ? window.location.origin : ''}/invite/{couple.inviteCode}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="px-3 py-2 text-sm text-warm-accent hover:bg-warm-accent/10
            rounded-[var(--radius-sm)] transition-colors whitespace-nowrap"
        >
          {copied ? t('inviteCopied') : t('inviteCopy')}
        </button>
      </div>
      {daysLeft !== null && (
        <p className="text-xs text-warm-muted">
          {t('inviteExpires', { days: daysLeft })}
        </p>
      )}
      <button
        type="button"
        onClick={handleRegenerate}
        className="px-3 py-2 text-xs text-warm-muted border border-warm-border
          rounded-[var(--radius-sm)] hover:bg-warm-bg transition-colors"
      >
        {t('inviteRegenerate')}
      </button>
    </div>
  )
}
