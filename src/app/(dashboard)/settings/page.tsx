'use client'

import { useEffect, useState } from 'react'
import { SettingsFormSkeleton } from '@/components/skeleton/settings-form-skeleton'

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
    isPublic: Boolean(data.isPublic),
    inviteCode: typeof data.inviteCode === 'string' ? data.inviteCode : null,
    inviteExpiresAt: typeof data.inviteExpiresAt === 'string' ? data.inviteExpiresAt : null,
  }
}

export function buildAvatarUpdatePayload(avatar: string) {
  const trimmed = avatar.trim()
  return { avatar: trimmed || null }
}

export function buildCoupleUpdatePayload(input: CoupleUpdateInput) {
  if (input.coverMode === 'NONE') {
    return {
      ...input,
      coverPhotoId: null,
      coverPhotoUrl: null,
    }
  }

  if (input.coverMode === 'UPLOAD') {
    return {
      ...input,
      coverPhotoId: null,
      coverPhotoUrl: input.coverPhotoUrl?.trim() || null,
    }
  }

  return {
    ...input,
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
  const [couple, setCouple] = useState<CoupleData | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [avatarInput, setAvatarInput] = useState('')
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
        setCouple(normalizeCoupleResponse(data))
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
      setMessage({ type: 'success', text: '头像已更新' })
    } else {
      const data = await res.json()
      setMessage({
        type: 'error',
        text: extractApiErrorMessage(data, '头像更新失败'),
      })
    }

    setAvatarSaving(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!couple) return

    setSaving(true)
    setMessage(null)

    const res = await fetch(`/api/couples/${couple.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildCoupleUpdatePayload(couple)),
    })

    if (res.ok) {
      const data = await res.json()
      setCouple(normalizeCoupleResponse(data))
      setMessage({ type: 'success', text: '保存成功' })
    } else {
      const data = await res.json()
      setMessage({
        type: 'error',
        text: extractApiErrorMessage(data, '保存失败'),
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

  if (loading) {
    return <SettingsFormSkeleton />
  }

  if (!couple) {
    return (
      <div className="text-center py-20">
        <p className="text-warm-muted">未找到空间信息</p>
      </div>
    )
  }

  const publicPreviewUrl = typeof window !== 'undefined'
    ? buildPublicPreviewUrl(window.location.origin, couple.slug)
    : ''
  const avatarPreviewUrl = avatarInput.trim() || profile?.avatar || ''

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-warm-text mb-6">空间设置</h1>

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
        <Section title="头像">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-20 h-20 shrink-0 rounded-full overflow-hidden border border-warm-border bg-warm-bg flex items-center justify-center">
              {avatarPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreviewUrl}
                  alt="当前头像预览"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-warm-muted text-center px-2">暂无头像</span>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <Field label="头像图片链接" hint="第一批先使用图片 URL 更新头像，后续可接上传器">
                <input
                  value={avatarInput}
                  onChange={e => setAvatarInput(e.target.value)}
                  className={inputClass}
                  placeholder="https://cdn.example.com/avatar.jpg"
                />
              </Field>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={avatarSaving}
                  className="px-4 py-2 text-sm bg-warm-accent text-white rounded-[var(--radius-md)]
                    hover:bg-warm-accent-hover disabled:opacity-50 transition-colors"
                >
                  {avatarSaving ? '保存中...' : '更新头像'}
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarInput('')}
                  className="px-4 py-2 text-sm border border-warm-border text-warm-text
                    rounded-[var(--radius-md)] hover:bg-warm-bg transition-colors"
                >
                  清空
                </button>
              </div>
            </div>
          </div>
        </Section>
      </form>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="基本信息">
          <Field label="空间名称">
            <input
              value={couple.name}
              onChange={e => setCouple(prev => prev ? { ...prev, name: e.target.value } : prev)}
              required
              className={inputClass}
              placeholder="给你们的空间起个名字"
            />
          </Field>

          <Field label="链接标识" hint="公开链接使用，仅支持字母数字和连字符">
            <input
              value={couple.slug}
              onChange={e => setCouple(prev => prev ? { ...prev, slug: e.target.value } : prev)}
              required
              pattern="^[a-z0-9-]+$"
              className={inputClass}
              placeholder="my-love-story"
            />
          </Field>

          <Field label="在一起的日子">
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

          <Field label="简介">
            <textarea
              value={couple.bio || ''}
              onChange={e => setCouple(prev => prev ? { ...prev, bio: e.target.value || null } : prev)}
              rows={3}
              className={inputClass + ' resize-none'}
              placeholder="写一段关于你们的介绍..."
            />
          </Field>
        </Section>

        <Section title="公开设置">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={couple.isPublic}
              onChange={e => setCouple(prev => prev ? { ...prev, isPublic: e.target.checked } : prev)}
              className="w-5 h-5 rounded border-warm-border text-warm-accent
                focus:ring-warm-accent/30 cursor-pointer"
            />
            <span className="text-sm text-warm-text">公开展示空间</span>
          </label>
          <p className="text-xs text-warm-muted mt-1 ml-8">
            开启后，任何人都可以通过公开链接查看你们的照片和时间轴
          </p>
        </Section>

        <Section title="空间封面">
          <Field label="封面来源">
            <select
              value={couple.coverMode}
              onChange={e => setCouple(prev => prev ? {
                ...prev,
                coverMode: e.target.value as CoverMode,
              } : prev)}
              className={inputClass}
            >
              <option value="NONE">不设置封面</option>
              <option value="PHOTO">使用已有照片</option>
              <option value="UPLOAD">使用外部图片</option>
            </select>
          </Field>

          {couple.coverMode === 'PHOTO' && (
            <>
              <Field label="封面照片 ID" hint="第一批先保留基础输入，后续再接照片选择器">
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
              <Field label="封面预览图链接" hint="用于 settings 内即时预览，也会一并保存">
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
            <Field label="封面图片链接" hint="第一批先用 URL 打通封面配置链路">
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
                  alt="空间封面预览"
                  className="w-full h-44 object-cover"
                />
              ) : (
                <div className="h-44 flex items-center justify-center text-sm text-warm-muted">
                  请输入可访问的封面图片链接以查看预览
                </div>
              )}
            </div>
          )}
        </Section>

        <Section title="公开预览">
          <Field label="公开访问链接">
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
              查看公开预览
            </button>
            <button
              type="button"
              disabled={!couple.slug}
              onClick={() => {
                navigator.clipboard.writeText(publicPreviewUrl)
                setMessage({ type: 'success', text: '已复制公开链接' })
              }}
              className="px-4 py-2 text-sm border border-warm-border text-warm-text
                rounded-[var(--radius-md)] hover:bg-warm-bg disabled:opacity-50 transition-colors"
            >
              复制公开链接
            </button>
          </div>

          <p className="text-xs text-warm-muted">
            {!couple.isPublic
              ? '需要先开启公开展示空间，外部访问才会生效。'
              : '当前已可从公开入口预览你们的空间页面。'}
          </p>
        </Section>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-warm-accent text-white rounded-[var(--radius-md)] font-medium
            hover:bg-warm-accent-hover disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </form>

      <div className="mt-10 pt-8 border-t border-warm-border">
        <Section title="邀请伴侣">
          {couple.inviteCode ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-warm-bg rounded-[var(--radius-sm)] text-sm text-warm-text border border-warm-border break-all">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/invite/{couple.inviteCode}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/invite/${couple.inviteCode}`)
                    setMessage({ type: 'success', text: '已复制邀请链接' })
                  }}
                  className="px-3 py-2 text-sm text-warm-accent hover:bg-warm-accent/10
                    rounded-[var(--radius-sm)] transition-colors whitespace-nowrap"
                >
                  复制
                </button>
              </div>
              {couple.inviteExpiresAt && (
                <p className="text-xs text-warm-muted">
                  有效期至 {new Date(couple.inviteExpiresAt).toLocaleDateString('zh-CN')}
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerateInvite}
              className="px-4 py-2 text-sm text-warm-accent border border-warm-accent
                rounded-[var(--radius-md)] hover:bg-warm-accent/10 transition-colors"
            >
              生成邀请链接
            </button>
          )}
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


