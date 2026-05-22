import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ReadinessCard } from '@/components/readiness-card'
import {
  buildDashboardReviewCard as buildDashboardReviewCardState,
  getDashboardMemoryReviewsByCoupleId,
} from '@/lib/memory-reviews/review-queries'
import {
  buildOrganizationReadiness,
  type OrganizationReadinessAction,
} from '@/lib/readiness/organization-readiness'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

export function buildDashboardCoupleUserQuery(userId: string) {
  return {
    where: { userId },
    select: {
      couple: {
        select: {
          id: true,
          name: true,
          slug: true,
          isPublic: true,
          startDate: true,
          _count: { select: { albums: true } },
        },
      },
    },
  } as const
}

export function buildDashboardReadinessCard({
  score,
  suggestions,
  actions,
}: {
  score: number
  suggestions: string[]
  actions: OrganizationReadinessAction[]
}) {
  return {
    score,
    hasSuggestions: suggestions.length > 0,
    suggestionCount: suggestions.length,
    hasActions: actions.length > 0,
    actionCount: actions.length,
  }
}

export function buildDashboardReviewCard(
  reviews: Array<{
    id: string
    type: 'YEARLY' | 'ANNIVERSARY'
    title: string
    year?: number | null
    publishedAt?: string | null
  }>
) {
  return buildDashboardReviewCardState(reviews as never)
}

export function buildDashboardReviewHighlights(
  reviews: Array<{
    id: string
    type: 'YEARLY' | 'ANNIVERSARY'
    title: string
    year?: number | null
    publishedAt?: string | null
  }>,
  now = new Date()
) {
  const currentYear = now.getUTCFullYear()
  const currentYearReview =
    reviews.find(review => review.type === 'YEARLY' && review.year === currentYear) ?? null

  const recentReview =
    [...reviews]
      .filter(review => review.publishedAt)
      .sort((left, right) =>
        new Date(right.publishedAt ?? 0).getTime() - new Date(left.publishedAt ?? 0).getTime()
      )[0] ?? null

  return {
    currentYearReview,
    recentReview,
  }
}

function formatStartDate(date: Date | null) {
  if (!date) return null

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export default async function DashboardPage() {
  const t = await getTranslations('DashboardPage')
  const session = await auth()
  if (!session) redirect('/login')

  const coupleUser = await prisma.coupleUser.findFirst(
    buildDashboardCoupleUserQuery(session.user.id)
  )

  if (!coupleUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="dashboard-surface-card w-full max-w-2xl rounded-[28px] px-6 py-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-warm-muted">
            Dashboard
          </p>
          <h1 className="mt-4 font-[var(--font-dashboard-title)] text-[clamp(2rem,4vw,3.4rem)] leading-none tracking-[-0.04em] text-warm-text">
            {t('emptyTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-warm-muted">
            {t('emptySubtitle')}
          </p>
          <a
            href="/settings"
            className="dashboard-pill-active mt-6 inline-flex rounded-[18px] px-6 py-3 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5"
          >
            {t('goToSettings')}
          </a>
        </div>
      </div>
    )
  }

  const couple = coupleUser.couple

  const photoCount = await prisma.photo.count({
    where: { album: { coupleId: couple.id } },
  })

  const milestoneCount = await prisma.milestone.count({
    where: { coupleId: couple.id },
  })
  const chapterCount = await prisma.albumChapter.count({
    where: { album: { coupleId: couple.id } },
  })
  const chapterPhotoCount = await prisma.photo.count({
    where: { album: { coupleId: couple.id }, chapterId: { not: null } },
  })

  const now = new Date()
  const daysTogether = couple.startDate
    ? Math.floor((now.getTime() - couple.startDate.getTime()) / (1000 * 60 * 60 * 24))
    : null

  const stats = [
    { label: t('photos'), value: photoCount, suffix: t('photoSuffix') },
    { label: t('albums'), value: couple._count.albums, suffix: t('albumSuffix') },
    { label: t('chapters'), value: chapterCount, suffix: t('chapterSuffix') },
    { label: t('milestones'), value: milestoneCount, suffix: t('milestoneSuffix') },
    ...(daysTogether !== null ? [{ label: t('daysTogether'), value: daysTogether, suffix: t('daySuffix') }] : []),
  ]
  const readiness = buildOrganizationReadiness({
    totalPhotos: photoCount,
    chapterPhotoCount,
    chapterCount,
  })
  const readinessCard = buildDashboardReadinessCard({
    score: readiness.score,
    suggestions: readiness.suggestions,
    actions: readiness.actions,
  })
  const reviews = await getDashboardMemoryReviewsByCoupleId(couple.id)
  const reviewCard = buildDashboardReviewCard(reviews)
  const reviewHighlights = buildDashboardReviewHighlights(reviews)
  const formattedStartDate = formatStartDate(couple.startDate)

  return (
    <div className="space-y-4 text-warm-text">
      <section
        className="dashboard-hero-surface relative overflow-hidden rounded-[28px] px-5 py-5 sm:px-6"
      >
        <div className="dashboard-hero-overlay absolute inset-0" />
        <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-[var(--dashboard-hero-soft)]">
              <span>Dashboard</span>
              <span className="h-1 w-1 rounded-full bg-[var(--dashboard-hero-faint)]" />
              <span>Velvet Plum</span>
            </div>
            <div className="space-y-2">
              <h1 className="max-w-2xl font-[var(--font-dashboard-title)] text-[clamp(2rem,4vw,3.6rem)] leading-[0.96] tracking-[-0.04em]">
                {couple.name || t('spaceNameFallback')}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[var(--dashboard-hero-muted)] sm:text-[15px]">
                {t('welcomeBack', { name: session.user.name || '' })}
              </p>
            </div>
          </div>

          <div className="dashboard-hero-panel rounded-[24px] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.26em] text-[var(--dashboard-hero-faint)]">
                  Summary
                </p>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[var(--dashboard-hero-muted)]">
                  {formattedStartDate
                    ? t('summaryWithStartDate', { date: formattedStartDate })
                    : t('summaryWithoutStartDate')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-[0.26em] text-[var(--dashboard-hero-faint)]">
                  Readiness
                </p>
                <p className="mt-2 font-[var(--font-display)] text-5xl leading-none tracking-[-0.05em] text-white">
                  {readinessCard.score}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/14 pt-4 text-[var(--dashboard-hero-muted)]">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--dashboard-hero-faint)]">
                  Suggestions
                </p>
                <p className="mt-2 font-[var(--font-display)] text-2xl leading-none">
                  {readinessCard.suggestionCount}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--dashboard-hero-faint)]">
                  Actions
                </p>
                <p className="mt-2 font-[var(--font-display)] text-2xl leading-none">
                  {readinessCard.actionCount}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--dashboard-hero-faint)]">
                  Public
                </p>
                <p className="mt-2 text-sm leading-5 text-white">
                  {couple.isPublic && couple.slug ? 'Live' : 'Private'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.95fr)]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat, index) => (
            <article
              key={stat.label}
              className="dashboard-surface-card group relative overflow-hidden rounded-[22px] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(49,28,39,0.12)] dark:hover:shadow-[0_18px_38px_rgba(0,0,0,0.22)]"
            >
              <div className="dashboard-hairline absolute inset-x-0 top-0 h-px" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.26em] text-warm-muted">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <p className="mt-3 text-sm text-warm-muted">{stat.label}</p>
                </div>
                <span className="dashboard-chip rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.22em]">
                  Archive
                </span>
              </div>
              <p className="mt-6 font-[var(--font-display)] text-[clamp(2rem,5vw,3.2rem)] leading-none tracking-[-0.05em] text-warm-text">
                {stat.value}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.24em] text-warm-muted">
                {stat.suffix}
              </p>
            </article>
          ))}
        </div>

        <div className="grid gap-4">
          <div className="dashboard-surface-card-strong rounded-[24px] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-warm-muted">
                  Public Link
                </p>
                <h2 className="mt-3 font-[var(--font-dashboard-title)] text-[28px] leading-none tracking-[-0.04em] text-warm-text">
                  分享页入口
                </h2>
              </div>
              <span className="dashboard-chip rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-warm-muted">
                {couple.isPublic && couple.slug ? 'Published' : 'Private'}
              </span>
            </div>

            {couple.isPublic && couple.slug ? (
              <div className="mt-5 space-y-4">
                <p className="text-sm leading-6 text-warm-muted">
                  {t('publicLink')}
                </p>
                <div className="dashboard-inset-panel rounded-[20px] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-warm-muted">
                    URL
                  </p>
                  <p className="mt-2 break-all font-medium text-warm-text">
                    /s/{couple.slug}
                  </p>
                </div>
                <p className="text-xs leading-5 text-warm-muted">
                  {t('publicLinkPublishedHint')}
                </p>
              </div>
            ) : (
              <div className="dashboard-empty-surface mt-5 rounded-[20px] px-4 py-5">
                <p className="text-sm leading-6 text-warm-muted">
                  {t('publicLinkPrivateHint')}
                </p>
              </div>
            )}
          </div>

          <div className="dashboard-surface-card-strong rounded-[24px] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-warm-muted">
                  Memory Reviews
                </p>
                <h2 className="mt-3 font-[var(--font-dashboard-title)] text-[28px] leading-none tracking-[-0.04em] text-warm-text">
                  {t('reviewTitle')}
                </h2>
              </div>
              <Link
                href="/reviews"
                className="dashboard-chip rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-warm-muted"
              >
                {t('openReview')}
              </Link>
            </div>
            <p className="mt-5 text-sm leading-6 text-warm-muted">
              {t('reviewSubtitle')}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="dashboard-inset-panel rounded-[20px] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-warm-muted">
                  {t('currentYearReview')}
                </p>
                <p className="mt-3 font-medium text-warm-text">
                  {reviewHighlights.currentYearReview?.title ?? t('reviewUnavailable')}
                </p>
              </div>
              <div className="dashboard-inset-panel rounded-[20px] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-warm-muted">
                  {t('recentReview')}
                </p>
                <p className="mt-3 font-medium text-warm-text">
                  {reviewHighlights.recentReview?.title ?? t('reviewUnavailable')}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-warm-muted">
              {reviewCard.reviewCount > 0
                ? t('reviewAvailableCount', { count: reviewCard.reviewCount })
                : t('reviewGenerateHint')}
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-surface-card-soft rounded-[26px] p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-warm-muted">
              Curation
            </p>
            <h2 className="mt-2 font-[var(--font-dashboard-title)] text-[26px] leading-none tracking-[-0.04em] text-warm-text">
              {t('curationTitle')}
            </h2>
          </div>
          <p className="max-w-xs text-right text-xs leading-5 text-warm-muted">
            {readinessCard.hasSuggestions
              ? t('curationSuggestionCount', { count: readinessCard.suggestionCount })
              : t('curationStableHint')}
          </p>
        </div>
        <ReadinessCard
          score={readiness.score}
          suggestions={readiness.suggestions}
          actions={readiness.actions}
        />
      </section>
    </div>
  )
}
