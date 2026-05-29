'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button, RefreshIcon, SparklesIcon } from '@/components/ui/button'

type MemoryReviewItem = {
  id: string
  type: 'YEARLY' | 'ANNIVERSARY'
  label: string
  title: string
  subtitle: string | null
  summary: string
  status: 'PROCESSING' | 'READY' | 'FAILED'
}

type Translator = (key: string) => string

export function buildReviewsUiText(t: Translator) {
  return {
    title: t('title'),
    subtitle: t('subtitle'),
    generateYearly: t('generateYearly'),
    generateAnniversary: t('generateAnniversary'),
    empty: t('empty'),
  }
}

export default function ReviewsPage() {
  const t = useTranslations('ReviewsPage')
  const [reviews, setReviews] = useState<MemoryReviewItem[]>([])
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<'YEARLY' | 'ANNIVERSARY' | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function fetchData() {
      const coupleRes = await fetch('/api/couples/mine')
      if (!coupleRes.ok) {
        setLoading(false)
        return
      }

      const couple = await coupleRes.json()
      setCoupleId(couple.id)

      const reviewsRes = await fetch(`/api/couples/${couple.id}/memory-reviews`)
      if (reviewsRes.ok) {
        const data = await reviewsRes.json()
        setReviews(data.reviews ?? [])
      }
      setLoading(false)
    }

    fetchData()
  }, [refreshKey])

  async function handleGenerate(type: 'YEARLY' | 'ANNIVERSARY') {
    if (!coupleId) return

    setSubmitting(type)
    try {
      await fetch(`/api/couples/${coupleId}/memory-reviews/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      setRefreshKey(key => key + 1)
    } finally {
      setSubmitting(null)
    }
  }

  const uiText = buildReviewsUiText(t)

  if (loading) {
    return <div className="animate-pulse rounded-[var(--radius-xl)] bg-warm-surface p-8 text-warm-muted">{uiText.title}</div>
  }

  return (
    <div className="space-y-6">
      <section className="dashboard-surface-card rounded-[28px] px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-warm-muted">Memory Reviews</p>
            <h1 className="dashboard-page-title mt-3 text-warm-text">
              {uiText.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-warm-muted">
              {uiText.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleGenerate('YEARLY')}
              loading={submitting === 'YEARLY'}
              disabled={submitting !== null && submitting !== 'YEARLY'}
              variant="brand"
              pill
              leadingIcon={<SparklesIcon />}
            >
              {submitting === 'YEARLY' ? `${uiText.generateYearly}...` : uiText.generateYearly}
            </Button>
            <Button
              onClick={() => handleGenerate('ANNIVERSARY')}
              loading={submitting === 'ANNIVERSARY'}
              disabled={submitting !== null && submitting !== 'ANNIVERSARY'}
              variant="secondary"
              pill
              leadingIcon={<RefreshIcon />}
            >
              {submitting === 'ANNIVERSARY'
                ? `${uiText.generateAnniversary}...`
                : uiText.generateAnniversary}
            </Button>
          </div>
        </div>
      </section>

      {reviews.length === 0 ? (
        <section className="dashboard-surface-card rounded-[24px] px-6 py-10 text-sm text-warm-muted">
          {uiText.empty}
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {reviews.map(review => (
            <Link
              key={review.id}
              href={`/reviews/${review.id}`}
              className="dashboard-surface-card-strong rounded-[24px] p-5 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.26em] text-warm-muted">
                    {review.type === 'YEARLY' ? t('yearlyLabel') : t('anniversaryLabel')}
                  </p>
                  <h2 className="dashboard-section-title mt-3 text-warm-text">
                    {review.title}
                  </h2>
                </div>
                <span className="dashboard-chip rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-warm-muted">
                  {review.status}
                </span>
              </div>
              {review.subtitle ? (
                <p className="mt-3 text-sm leading-6 text-warm-muted">{review.subtitle}</p>
              ) : null}
              <p className="mt-4 text-sm leading-6 text-warm-muted">{review.summary}</p>
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}
