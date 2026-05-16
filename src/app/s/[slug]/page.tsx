import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import {
  getPublicSpacePageDataBySlug,
  resolvePublicMetadata,
} from '@/lib/public-metadata'

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

  return (
    <div className="relative">
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
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

          {space.bio && (
            <p className="text-film-muted text-lg leading-relaxed max-w-md mx-auto">
              {space.bio}
            </p>
          )}
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

      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NavCard
              href={`/s/${slug}/photos`}
              title={t('photos')}
              subtitle={t('photosSubtitle')}
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
              title={t('timeline')}
              subtitle={t('timelineSubtitle')}
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
          </div>
        </div>
      </section>

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
