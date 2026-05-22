import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMemoryReviewById } from '@/lib/memory-reviews/review-queries'

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ reviewId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { reviewId } = await params
  const t = await getTranslations('ReviewDetailPage')

  const coupleUser = await prisma.coupleUser.findFirst({
    where: { userId: session.user.id },
    select: {
      coupleId: true,
      couple: {
        select: {
          name: true,
          slug: true,
          isPublic: true,
        },
      },
    },
  })

  if (!coupleUser) {
    notFound()
  }

  const review = await getMemoryReviewById(coupleUser.coupleId, reviewId)
  if (!review) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Link
        href="/reviews"
        className="inline-flex items-center gap-1.5 text-sm text-warm-muted transition-colors hover:text-warm-text"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        {t('back')}
      </Link>

      <section className="dashboard-surface-card-strong rounded-[28px] overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative min-h-[280px] bg-warm-bg">
            {review.coverPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={review.coverPhotoUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
          </div>

          <div className="p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.3em] text-warm-muted">
              {coupleUser.couple.name}
            </p>
            <h1 className="mt-4 font-[var(--font-dashboard-title)] text-[clamp(2rem,4vw,3rem)] leading-none tracking-[-0.04em] text-warm-text">
              {review.title}
            </h1>
            {review.subtitle ? (
              <p className="mt-4 text-sm uppercase tracking-[0.18em] text-warm-muted">{review.subtitle}</p>
            ) : null}
            <p className="mt-5 text-sm leading-7 text-warm-muted">{review.summary}</p>

            {coupleUser.couple.isPublic && coupleUser.couple.slug ? (
              <div className="mt-6">
                <a
                  href={`/s/${coupleUser.couple.slug}/review/share/${review.type === 'YEARLY' ? 'yearly' : 'anniversary'}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-[18px] border border-warm-border px-4 py-2.5 text-sm text-warm-text transition-colors hover:bg-warm-bg"
                >
                  {t('openShareCard')}
                </a>
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              {review.highlights.map(highlight => (
                <div
                  key={highlight.id}
                  className="rounded-[20px] border border-warm-border bg-warm-bg/70 p-4"
                >
                  <h2 className="text-lg font-semibold text-warm-text">{highlight.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-warm-muted">{highlight.narrative}</p>
                  {highlight.date || highlight.locationName ? (
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-warm-muted">
                      {[highlight.date?.slice(0, 10), highlight.locationName]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <p className="mt-6 text-sm leading-7 text-warm-text">{review.closing}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
