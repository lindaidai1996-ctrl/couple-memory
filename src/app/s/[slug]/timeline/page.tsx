import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TimelineView } from '@/components/timeline-view'
import {
  getPublicSpacePageDataBySlug,
  getPublicTimelineByCoupleId,
  resolvePublicMetadata,
} from '@/lib/public-metadata'

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

  if (!space?.isPublic) {
    notFound()
  }

  const milestones = await getPublicTimelineByCoupleId(space.id)

  return (
    <div className="min-h-screen px-6 py-12 md:py-20">
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/s/${slug}`}
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
          返回
        </Link>

        <h1
          className="text-3xl md:text-4xl font-bold mb-12 md:mb-16 text-center"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          时间轴
        </h1>

        {milestones.length === 0 ? (
          <EmptyState />
        ) : (
          <TimelineView milestones={milestones} />
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <p className="text-film-muted text-lg">暂无时间轴记录</p>
    </div>
  )
}
