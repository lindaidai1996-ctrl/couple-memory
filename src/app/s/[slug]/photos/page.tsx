import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { PhotoStream } from '@/components/photo-stream'
import {
  getPublicPhotosByCoupleId,
  getPublicSpacePageDataBySlug,
  resolvePublicMetadata,
} from '@/lib/public-metadata'

type Translator = (key: string) => string

export function buildPublicPhotosUiText(t: Translator) {
  return {
    back: t('back'),
    title: t('title'),
    end: t('end'),
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return resolvePublicMetadata({ slug, page: 'photos' })
}

export default async function PhotosPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const space = await getPublicSpacePageDataBySlug(slug)
  const t = await getTranslations('PublicPhotosPage')

  if (!space?.isPublic) {
    notFound()
  }

  const photos = await getPublicPhotosByCoupleId(space.id)
  const uiText = buildPublicPhotosUiText(t)

  return (
    <div className="min-h-screen py-12">
      <header className="max-w-5xl mx-auto px-4 mb-12">
        <Link
          href={`/s/${slug}`}
          className="inline-flex items-center gap-2 text-film-muted hover:text-film-accent-light
            transition-colors text-sm mb-8"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {uiText.back}
        </Link>

        <h1
          className="text-3xl md:text-4xl font-bold"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {uiText.title}
        </h1>
      </header>

      {photos.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <PhotoStream photos={photos} />

          <div className="py-12 flex justify-center">
            <p className="text-film-muted text-sm">{uiText.end}</p>
          </div>
        </>
      )}
    </div>
  )
}

function EmptyState() {
  // Server component helper keeps text grouped and easy to localize.
  return <EmptyStateContent />
}

async function EmptyStateContent() {
  const t = await getTranslations('PublicPhotosPage')
  return (
    <div className="text-center py-24 px-6">
      <p className="text-film-muted text-lg mb-2">{t('empty')}</p>
      <p className="text-film-muted/60 text-sm">{t('emptyDescription')}</p>
    </div>
  )
}
