'use client'

import { useState, useEffect } from 'react'

interface CoupleData {
  id: string
  name: string
  slug: string
  startDate: string | null
  bio: string | null
  isPublic: boolean
  inviteCode: string | null
  inviteExpiresAt: string | null
}

export default function SettingsPage() {
  const [couple, setCouple] = useState<CoupleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function fetchCouple() {
      const res = await fetch('/api/couples/mine')
      if (res.ok) {
        setCouple(await res.json())
      }
      setLoading(false)
    }
    fetchCouple()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!couple) return
    setSaving(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)

    const res = await fetch(`/api/couples/${couple.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        slug: formData.get('slug'),
        startDate: formData.get('startDate') || null,
        bio: formData.get('bio') || null,
        isPublic: formData.get('isPublic') === 'on',
      }),
    })

    if (res.ok) {
      setCouple(await res.json())
      setMessage({ type: 'success', text: '保存成功' })
    } else {
      const data = await res.json()
      setMessage({ type: 'error', text: data.error || '保存失败' })
    }
    setSaving(false)
  }

  async function handleGenerateInvite() {
    if (!couple) return
    const res = await fetch(`/api/couples/${couple.id}/invite`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setCouple(prev => prev ? { ...prev, inviteCode: data.inviteCode, inviteExpiresAt: data.inviteExpiresAt } : null)
    }
  }

  if (loading) {
    return <SettingsSkeleton />
  }

  if (!couple) {
    return (
      <div className="text-center py-20">
        <p className="text-warm-muted">未找到空间信息</p>
      </div>
    )
  }

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

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="基本信息">
          <Field label="空间名称">
            <input
              name="name"
              defaultValue={couple.name}
              required
              className={inputClass}
              placeholder="给你们的空间起个名字"
            />
          </Field>

          <Field label="链接标识" hint="公开链接使用，仅支持字母数字和连字符">
            <input
              name="slug"
              defaultValue={couple.slug}
              required
              pattern="^[a-z0-9-]+$"
              className={inputClass}
              placeholder="my-love-story"
            />
          </Field>

          <Field label="在一起的日子">
            <input
              name="startDate"
              type="date"
              defaultValue={couple.startDate?.split('T')[0] || ''}
              className={inputClass}
            />
          </Field>

          <Field label="简介">
            <textarea
              name="bio"
              defaultValue={couple.bio || ''}
              rows={3}
              className={inputClass + ' resize-none'}
              placeholder="写一段关于你们的介绍..."
            />
          </Field>
        </Section>

        <Section title="公开设置">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              name="isPublic"
              type="checkbox"
              defaultChecked={couple.isPublic}
              className="w-5 h-5 rounded border-warm-border text-warm-accent
                focus:ring-warm-accent/30 cursor-pointer"
            />
            <span className="text-sm text-warm-text">公开展示空间</span>
          </label>
          <p className="text-xs text-warm-muted mt-1 ml-8">
            开启后，任何人都可以通过公开链接查看你们的照片和时间轴
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

function SettingsSkeleton() {
  return (
    <div className="max-w-2xl animate-pulse">
      <div className="h-8 bg-warm-border rounded w-32 mb-6" />
      <div className="bg-warm-surface rounded-[var(--radius-lg)] p-5 border border-warm-border space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i}>
            <div className="h-4 bg-warm-border rounded w-20 mb-2" />
            <div className="h-10 bg-warm-border rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
