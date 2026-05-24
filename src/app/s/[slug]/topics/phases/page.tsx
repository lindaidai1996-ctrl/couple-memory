import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import {
  getPublicNarrativeAlbumsByCoupleId,
  getPublicSpacePageDataBySlug,
  resolvePublicMetadata,
  type PublicNarrativeAlbum,
} from '@/lib/public-metadata'

type Translator = (key: string, values?: Record<string, string | number>) => string

export function buildPublicPhaseTopicUiText(t: Translator) {
  return {
    back: t('back'),
    title: t('title'),
    subtitle: t('subtitle'),
    chapterCount: (count: number) => t('chapterCount', { count }),
    empty: t('empty'),
  }
}

export function buildPublicPhaseTopicCards(albums: PublicNarrativeAlbum[]) {
  return albums.map(album => ({
    id: album.id,
    title: album.title,
    description: album.description,
    coverPhotoUrl: album.coverPhotoUrl,
    chapterCount: album.chapters.length,
    chapterPreview: album.chapters.slice(0, 2).map(chapter => chapter.title),
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return resolvePublicMetadata({ slug, page: 'topics' })
}

export default async function PublicPhaseTopicsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const space = await getPublicSpacePageDataBySlug(slug)
  const t = await getTranslations('PublicPhaseTopicPage')

  if (!space?.isPublic) notFound()

  const albums = await getPublicNarrativeAlbumsByCoupleId(space.id)
  const uiText = buildPublicPhaseTopicUiText(t)
  const cards = buildPublicPhaseTopicCards(albums)

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
          <p className="mb-3 text-sm uppercase tracking-[0.24em] text-film-accent/80">{uiText.title}</p>
          <h1 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
            {space.name}
          </h1>
          <p className="mt-3 text-sm leading-7 text-film-muted md:text-base">{uiText.subtitle}</p>
        </header>

        {cards.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {cards.map(card => (
              <article
                key={card.id}
                className="overflow-hidden rounded-[var(--radius-xl)] border border-film-surface bg-film-surface/70"
              >
                <div className="relative min-h-[240px] bg-film-surface">
                  {card.coverPhotoUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.coverPhotoUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/25 to-film-bg" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_55%),linear-gradient(135deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))]" />
                  )}
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{card.title}</h2>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-film-accent/70">
                      {uiText.chapterCount(card.chapterCount)}
                    </p>
                  </div>

                  {card.description ? (
                    <p className="text-sm leading-7 text-film-muted">{card.description}</p>
                  ) : null}

                  {card.chapterPreview.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {card.chapterPreview.map(chapterTitle => (
                        <span
                          key={chapterTitle}
                          className="rounded-full border border-film-surface bg-film-surface/80 px-3 py-1 text-xs tracking-[0.12em] text-film-muted"
                        >
                          {chapterTitle}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-xl)] border border-film-surface bg-film-surface/60 px-6 py-10 text-center text-film-muted">
            {uiText.empty}
          </div>
        )}
      </div>
    </div>
  )
}
