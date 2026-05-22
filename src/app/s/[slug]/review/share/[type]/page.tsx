import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import {
  getPublicMemoryReviewsByCoupleId,
  getPublicSpacePageDataBySlug,
  resolvePublicMetadata,
} from '@/lib/public-metadata'

type ShareType = 'yearly' | 'anniversary'
type Translator = (key: string) => string

export function buildPublicReviewShareUiText(t: Translator) {
  return {
    back: t('back'),
    eyebrow: t('eyebrow'),
    closingLabel: t('closingLabel'),
    highlightsLabel: t('highlightsLabel'),
    notFound: t('notFound'),
  }
}

export function buildPublicReviewShareCard(review: {
  title: string
  subtitle: string | null
  summary: string
  closing: string
  highlights: Array<{
    id: string
    title: string
    narrative: string
    date: string
    locationName?: string | null
  }>
}) {
  return {
    title: review.title,
    subtitle: review.subtitle,
    summary: review.summary,
    closing: review.closing,
    highlights: review.highlights.slice(0, 3),
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; type: ShareType }>
}) {
  const { slug } = await params
  return resolvePublicMetadata({ slug, page: 'review' })
}

export default async function PublicReviewSharePage({
  params,
}: {
  params: Promise<{ slug: string; type: ShareType }>
}) {
  const { slug, type } = await params
  const space = await getPublicSpacePageDataBySlug(slug)
  const t = await getTranslations('PublicReviewSharePage')

  if (!space?.isPublic) {
    notFound()
  }

  const reviews = await getPublicMemoryReviewsByCoupleId(space.id)
  const review = type === 'yearly' ? reviews.yearlyReview : reviews.anniversaryReview
  if (!review) {
    notFound()
  }

  const uiText = buildPublicReviewShareUiText(t)
  const card = buildPublicReviewShareCard(review)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_45%),linear-gradient(180deg,#130d13_0%,#1f1420_48%,#120d13_100%)] px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/s/${slug}/review`}
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-white/72 transition-colors hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {uiText.back}
        </Link>

        <article className="overflow-hidden rounded-[32px] border border-white/12 bg-black/20 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="relative min-h-[240px] overflow-hidden border-b border-white/10">
            {review.coverPhotoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={review.coverPhotoUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-[#120d13]" />
              </>
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_35%),linear-gradient(135deg,_rgba(255,255,255,0.12),_rgba(255,255,255,0.03))]" />
            )}
            <div className="relative z-10 flex min-h-[240px] flex-col justify-end px-8 py-8">
              <p className="text-xs uppercase tracking-[0.32em] text-white/70">
                {space.name} · {uiText.eyebrow}
              </p>
              <h1
                className="mt-4 max-w-2xl text-[clamp(2.4rem,6vw,4.4rem)] font-bold leading-[0.92] tracking-[-0.05em]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {card.title}
              </h1>
              {card.subtitle ? (
                <p className="mt-4 max-w-xl text-sm uppercase tracking-[0.2em] text-white/72">
                  {card.subtitle}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="border-b border-white/10 px-8 py-8 lg:border-b-0 lg:border-r">
              <p className="text-sm leading-8 text-white/82">{card.summary}</p>

              <div className="mt-8">
                <p className="text-xs uppercase tracking-[0.28em] text-white/62">
                  {uiText.highlightsLabel}
                </p>
                <div className="mt-4 space-y-4">
                  {card.highlights.map(highlight => (
                    <div
                      key={highlight.id}
                      className="rounded-[22px] border border-white/10 bg-white/6 px-5 py-4"
                    >
                      <h2 className="text-lg font-semibold text-white">{highlight.title}</h2>
                      <p className="mt-2 text-sm leading-7 text-white/74">{highlight.narrative}</p>
                      {highlight.date || highlight.locationName ? (
                        <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/52">
                          {[highlight.date?.slice(0, 10), highlight.locationName]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-8 py-8">
              <p className="text-xs uppercase tracking-[0.28em] text-white/62">
                {uiText.closingLabel}
              </p>
              <p className="mt-4 text-base leading-8 text-white/86">{card.closing}</p>

              <div className="mt-10 rounded-[26px] border border-white/10 bg-white/5 px-6 py-6">
                <p className="text-xs uppercase tracking-[0.24em] text-white/58">Couple Memory</p>
                <p className="mt-3 text-sm leading-7 text-white/72">
                  {space.name}
                </p>
                <p className="mt-6 text-xs uppercase tracking-[0.24em] text-white/40">
                  /s/{slug}/review/share/{type}
                </p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}
