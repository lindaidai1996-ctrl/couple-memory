import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { TimelineView } from '@/components/timeline-view'
import {
  getPublicSpacePageDataBySlug,
  getPublicTimelineByCoupleId,
  resolvePublicMetadata,
} from '@/lib/public-metadata'
import { buildPublicSpaceHomePath } from '@/lib/public-routes'

type Translator = (key: string) => string

export function buildPublicTimelineUiText(t: Translator) {
  return {
    back: t('back'),
    title: t('title'),
    empty: t('empty'),
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return resolvePublicMetadata({ slug, page: 'timeline' })
}

export default async function PublicTimelinePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const space = await getPublicSpacePageDataBySlug(slug)
  const t = await getTranslations('PublicTimelinePage')

  if (!space?.isPublic) {
    notFound()
  }

  const milestones = await getPublicTimelineByCoupleId(space.id)
  const uiText = buildPublicTimelineUiText(t)

  return (
    <div className="min-h-screen px-6 py-12 md:py-20">
      <div className="max-w-4xl mx-auto">
        <Link
          href={buildPublicSpaceHomePath(slug)}
          className="inline-flex items-center gap-1.5 text-sm text-film-muted hover:text-film-accent-light
            transition-colors mb-10"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {uiText.back}
        </Link>

        <h1
          className="text-3xl md:text-4xl font-bold mb-12 md:mb-16 text-center"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {uiText.title}
        </h1>

        {milestones.length === 0 ? (
          <EmptyState text={uiText.empty} />
        ) : (
          <TimelineView milestones={milestones} />
        )}
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-20">
      <p className="text-film-muted text-lg">{text}</p>
    </div>
  )
}
