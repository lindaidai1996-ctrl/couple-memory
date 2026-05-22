import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import {
  getPublicMemoryReviewsByCoupleId,
  getPublicNarrativeAlbumsByCoupleId,
  getPublicSpacePageDataBySlug,
  type PublicNarrativeAlbum,
  resolvePublicMetadata,
} from '@/lib/public-metadata'

type Translator = (key: string) => string

export function buildPublicHomeUiText(t: Translator) {
  return {
    photos: t('photos'),
    photosSubtitle: t('photosSubtitle'),
    timeline: t('timeline'),
    timelineSubtitle: t('timelineSubtitle'),
    narrativeTitle: t('narrativeTitle'),
    narrativeSubtitle: t('narrativeSubtitle'),
    narrativeEmpty: t('narrativeEmpty'),
    chapterLabel: t('chapterLabel'),
    review: t('review'),
    reviewSubtitle: t('reviewSubtitle'),
  }
}

export function buildPublicHomeNarrativeSection({
  albums,
}: {
  albums: PublicNarrativeAlbum[]
}) {
  return {
    hasNarrativeAlbums: albums.length > 0,
    items: albums.map(album => ({
      ...album,
      chapterPreviewCount: Math.min(album.chapters.length, 2),
      chapters: album.chapters.slice(0, 2),
    })),
  }
}

export function buildPublicHomeSectionOrder({
  hasNarrativeAlbums,
}: {
  hasNarrativeAlbums: boolean
}) {
  return hasNarrativeAlbums
    ? (['hero', 'narrative', 'explore'] as const)
    : (['hero', 'narrative', 'explore'] as const)
}

export function buildPublicHomeReviewSection({
  yearlyReviewTitle,
  anniversaryReviewTitle,
}: {
  yearlyReviewTitle: string | null
  anniversaryReviewTitle: string | null
}) {
  return {
    hasReviews: Boolean(yearlyReviewTitle || anniversaryReviewTitle),
    yearlyReviewTitle,
    anniversaryReviewTitle,
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return resolvePublicMetadata({ slug, page: 'home' })
}

export default async function PublicHomePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const space = await getPublicSpacePageDataBySlug(slug)
  const t = await getTranslations('PublicPage')

  if (!space?.isPublic) {
    notFound()
  }

  const narrativeAlbums = await getPublicNarrativeAlbumsByCoupleId(space.id)
  const reviews = await getPublicMemoryReviewsByCoupleId(space.id)
  const uiText = buildPublicHomeUiText(t)
  const narrativeSection = buildPublicHomeNarrativeSection({ albums: narrativeAlbums })
  const reviewSection = buildPublicHomeReviewSection({
    yearlyReviewTitle: reviews.yearlyReview?.title ?? null,
    anniversaryReviewTitle: reviews.anniversaryReview?.title ?? null,
  })
  const sectionOrder = buildPublicHomeSectionOrder({
    hasNarrativeAlbums: narrativeSection.hasNarrativeAlbums,
  })

  return (
    <div className="relative">
      {sectionOrder.map(section => {
        if (section === 'hero') {
          return (
            <section key="hero" className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
              {space.coverPhotoUrl ? (
                <div className="absolute inset-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={space.coverPhotoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-film-bg" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-film-surface via-film-bg to-film-bg" />
              )}

              <div className="relative z-10 text-center px-6 max-w-2xl">
                <h1
                  className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {space.name}
                </h1>

                {space.bio ? (
                  <p className="text-film-muted text-lg leading-relaxed max-w-md mx-auto">
                    {space.bio}
                  </p>
                ) : null}
              </div>

              <div className="absolute bottom-10 z-10 text-film-muted">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </div>
            </section>
          )
        }

        if (section === 'narrative') {
          return (
            <section key="narrative" className="px-6 py-24">
              <div className="max-w-5xl mx-auto">
                <div className="mb-8 max-w-2xl">
                  <p className="text-sm uppercase tracking-[0.24em] text-film-accent/80 mb-3">
                    {uiText.narrativeTitle}
                  </p>
                  <h2
                    className="text-3xl md:text-4xl font-bold mb-3"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {uiText.narrativeSubtitle}
                  </h2>
                </div>

                {narrativeSection.hasNarrativeAlbums ? (
                  <div className="space-y-6">
                    {narrativeSection.items.map(album => (
                      <article
                        key={album.id}
                        className="overflow-hidden rounded-[var(--radius-xl)] border border-film-surface bg-film-surface/70"
                      >
                        <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
                          <div className="relative min-h-[240px] bg-film-surface">
                            {album.coverPhotoUrl ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={album.coverPhotoUrl}
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
                            <h3
                              className="text-2xl font-bold text-white"
                              style={{ fontFamily: 'var(--font-display)' }}
                            >
                              {album.title}
                            </h3>

                            {album.description ? (
                              <p className="mt-3 text-sm leading-7 text-film-muted">
                                {album.description}
                              </p>
                            ) : null}

                            {album.chapters.length > 0 ? (
                              <div className="mt-6 space-y-4">
                                {album.chapters.map(chapter => (
                                  <div
                                    key={chapter.id}
                                    className="rounded-[var(--radius-lg)] border border-white/10 bg-black/10 p-4"
                                  >
                                    <p className="text-xs uppercase tracking-[0.18em] text-film-accent/75">
                                      {uiText.chapterLabel}
                                    </p>
                                    <h4 className="mt-2 text-lg font-semibold text-white">{chapter.title}</h4>
                                    <p className="mt-2 text-sm leading-6 text-film-muted">{chapter.summary}</p>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[var(--radius-xl)] border border-film-surface bg-film-surface/60 px-6 py-10 text-center text-film-muted">
                    {uiText.narrativeEmpty}
                  </div>
                )}
              </div>
            </section>
          )
        }

        return (
          <section key="explore" className="pb-24 px-6">
            <div className="max-w-3xl mx-auto">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <NavCard
                  href={`/s/${slug}/photos`}
                  title={uiText.photos}
                  subtitle={uiText.photosSubtitle}
                  icon={
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                  }
                />
                <NavCard
                  href={`/s/${slug}/timeline`}
                  title={uiText.timeline}
                  subtitle={uiText.timelineSubtitle}
                  icon={
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <line x1="12" y1="2" x2="12" y2="22" />
                      <circle cx="12" cy="6" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="18" r="2" />
                    </svg>
                  }
                />
                <NavCard
                  href={`/s/${slug}/review`}
                  title={uiText.review}
                  subtitle={
                    reviewSection.hasReviews
                      ? [reviewSection.yearlyReviewTitle, reviewSection.anniversaryReviewTitle]
                          .filter(Boolean)
                          .join(' · ')
                      : uiText.reviewSubtitle
                  }
                  icon={
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M7 4h10" />
                      <path d="M5 8h14" />
                      <path d="M7 12h10" />
                      <path d="M7 16h7" />
                      <path d="M5 20h14" />
                    </svg>
                  }
                />
              </div>
            </div>
          </section>
        )
      })}

      <footer className="border-t border-film-surface py-12 px-6 text-center">
        <p className="text-film-muted text-sm">{space.name} · Couple Memory</p>
      </footer>
    </div>
  )
}

function NavCard({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string
  title: string
  subtitle: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group block bg-film-surface rounded-[var(--radius-lg)] p-8
        border border-transparent hover:border-film-accent/30 transition-all duration-300"
    >
      <div className="text-film-accent mb-4 group-hover:text-film-accent-light transition-colors">
        {icon}
      </div>
      <h3
        className="text-xl font-bold mb-2 group-hover:text-film-accent-light transition-colors"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h3>
      <p className="text-film-muted text-sm">{subtitle}</p>
    </Link>
  )
}
