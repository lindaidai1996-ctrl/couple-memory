import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PhotoStream } from '@/components/photo-stream'
import {
  getPublicPhotosByCoupleId,
  getPublicSpacePageDataBySlug,
  resolvePublicMetadata,
} from '@/lib/public-metadata'

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

  if (!space?.isPublic) {
    notFound()
  }

  const photos = await getPublicPhotosByCoupleId(space.id)

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
          返回
        </Link>

        <h1
          className="text-3xl md:text-4xl font-bold"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          照片
        </h1>
      </header>

      {photos.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <PhotoStream photos={photos} />

          <div className="py-12 flex justify-center">
            <p className="text-film-muted text-sm">已展示全部照片</p>
          </div>
        </>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-24 px-6">
      <p className="text-film-muted text-lg mb-2">暂无照片</p>
      <p className="text-film-muted/60 text-sm">这里还没有上传任何照片</p>
    </div>
  )
}
