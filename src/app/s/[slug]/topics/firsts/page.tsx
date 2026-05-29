import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import {
  getPublicFirstMomentsByCoupleId,
  getPublicSpacePageDataBySlug,
  resolvePublicMetadata,
  type PublicFirstMoment,
} from '@/lib/public-metadata'
import { buildPublicSpaceHomePath } from '@/lib/public-routes'

type Translator = (key: string) => string

export function buildPublicFirstsUiText(t: Translator) {
  return {
    back: t('back'),
    title: t('title'),
    subtitle: t('subtitle'),
    firstMilestone: t('firstMilestone'),
    firstPlace: t('firstPlace'),
    firstPhoto: t('firstPhoto'),
    empty: t('empty'),
  }
}

export function buildPublicFirstsSections(firsts: {
  firstMilestone: PublicFirstMoment | null
  firstPlace: PublicFirstMoment | null
  firstPhoto: PublicFirstMoment | null
}) {
  return [
    { id: 'firstMilestone', item: firsts.firstMilestone },
    { id: 'firstPlace', item: firsts.firstPlace },
    { id: 'firstPhoto', item: firsts.firstPhoto },
  ] as const
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return resolvePublicMetadata({ slug, page: 'topics' })
}

export default async function PublicFirstsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const space = await getPublicSpacePageDataBySlug(slug)
  const t = await getTranslations('PublicFirstsPage')

  if (!space?.isPublic) notFound()

  const firsts = await getPublicFirstMomentsByCoupleId(space.id)
  const uiText = buildPublicFirstsUiText(t)
  const sections = buildPublicFirstsSections(firsts)
  const hasAny = sections.some(section => section.item)

  return (
    <div className="min-h-screen px-6 py-12 md:py-20">
      <div className="mx-auto max-w-5xl">
        <Link
          href={buildPublicSpaceHomePath(slug)}
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

        {hasAny ? (
          <div className="grid gap-6 md:grid-cols-3">
            {sections.map(section => (
              <article
                key={section.id}
                className="overflow-hidden rounded-[var(--radius-xl)] border border-film-surface bg-film-surface/70"
              >
                <div className="relative min-h-[220px] bg-film-surface">
                  {section.item?.imageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={section.item.imageUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/25 to-film-bg" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_55%),linear-gradient(135deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))]" />
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-film-accent/75">
                    {section.id === 'firstMilestone'
                      ? uiText.firstMilestone
                      : section.id === 'firstPlace'
                        ? uiText.firstPlace
                        : uiText.firstPhoto}
                  </p>
                  <h2 className="mt-3 text-xl font-semibold text-white">
                    {section.item?.title ?? uiText.empty}
                  </h2>
                  {section.item ? (
                    <>
                      <p className="mt-3 text-sm leading-7 text-film-muted">{section.item.narrative}</p>
                      {section.item.date || section.item.locationName ? (
                        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-film-accent/70">
                          {[section.item.date?.slice(0, 10), section.item.locationName]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      ) : null}
                    </>
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
