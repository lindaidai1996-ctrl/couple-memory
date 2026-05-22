import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import {
  getPublicMemoryReviewsByCoupleId,
  getPublicSpacePageDataBySlug,
  type PublicReviewPair,
  resolvePublicMetadata,
} from '@/lib/public-metadata'

type Translator = (key: string) => string

export function buildPublicReviewUiText(t: Translator) {
  return {
    back: t('back'),
    title: t('title'),
    subtitle: t('subtitle'),
    yearlyTitle: t('yearlyTitle'),
    yearlyEmpty: t('yearlyEmpty'),
    anniversaryTitle: t('anniversaryTitle'),
    anniversaryEmpty: t('anniversaryEmpty'),
  }
}

export function buildPublicReviewSections(reviews: PublicReviewPair) {
  return [
    {
      id: 'yearly',
      review: reviews.yearlyReview,
    },
    {
      id: 'anniversary',
      review: reviews.anniversaryReview,
    },
  ] as const
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return resolvePublicMetadata({ slug, page: 'review' })
}

export default async function PublicReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const space = await getPublicSpacePageDataBySlug(slug)
  const t = await getTranslations('PublicReviewPage')

  if (!space?.isPublic) {
    notFound()
  }

  const reviews = await getPublicMemoryReviewsByCoupleId(space.id)
  const uiText = buildPublicReviewUiText(t)
  const sections = buildPublicReviewSections(reviews)

  return (
    <div className="min-h-screen px-6 py-12 md:py-20">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/s/${slug}`}
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-film-muted transition-colors hover:text-film-accent-light"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {uiText.back}
        </Link>

        <header className="mb-12 max-w-3xl">
          <p className="mb-3 text-sm uppercase tracking-[0.24em] text-film-accent/80">
            {uiText.title}
          </p>
          <h1
            className="text-3xl font-bold md:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {space.name}
          </h1>
          <p className="mt-3 text-sm leading-7 text-film-muted md:text-base">
            {uiText.subtitle}
          </p>
        </header>

        <div className="space-y-8">
          {sections.map(section => (
            <section
              key={section.id}
              className="overflow-hidden rounded-[var(--radius-xl)] border border-film-surface bg-film-surface/70"
            >
              <div className="border-b border-white/10 px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-film-accent/75">
                      {section.id === 'yearly' ? uiText.yearlyTitle : uiText.anniversaryTitle}
                    </p>
                    <h2
                      className="mt-3 text-2xl font-bold text-white"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {section.review?.title ??
                        (section.id === 'yearly' ? uiText.yearlyEmpty : uiText.anniversaryEmpty)}
                    </h2>
                  </div>
                  {section.review ? (
                    <Link
                      href={`/s/${slug}/review/share/${section.id}`}
                      className="rounded-full border border-white/14 px-4 py-2 text-xs uppercase tracking-[0.18em] text-film-accent-light transition-colors hover:bg-white/8"
                    >
                      {t('shareCard')}
                    </Link>
                  ) : null}
                </div>
              </div>

              {section.review ? (
                <article className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
                  <div className="relative min-h-[240px] bg-film-surface">
                    {section.review.coverPhotoUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={section.review.coverPhotoUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-tr from-film-bg via-black/15 to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_55%),linear-gradient(135deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))]" />
                    )}
                  </div>

                  <div className="p-6 md:p-8">
                    {section.review.subtitle ? (
                      <p className="text-sm uppercase tracking-[0.18em] text-film-accent/75">
                        {section.review.subtitle}
                      </p>
                    ) : null}
                    <p className="mt-4 text-sm leading-7 text-film-muted">
                      {section.review.summary}
                    </p>

                    <div className="mt-6 space-y-4">
                      {section.review.highlights.map(highlight => (
                        <div
                          key={highlight.id}
                          className="rounded-[var(--radius-lg)] border border-white/10 bg-black/10 p-4"
                        >
                          <h3 className="text-lg font-semibold text-white">{highlight.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-film-muted">
                            {highlight.narrative}
                          </p>
                          {highlight.date || highlight.locationName ? (
                            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-film-accent/70">
                              {[highlight.date?.slice(0, 10), highlight.locationName]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <p className="mt-6 text-sm leading-7 text-white/85">{section.review.closing}</p>
                  </div>
                </article>
              ) : (
                <div className="px-6 py-10 text-sm text-film-muted">
                  {section.id === 'yearly' ? uiText.yearlyEmpty : uiText.anniversaryEmpty}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
