import { notFound } from 'next/navigation'

import { SiteFooter } from '@/components/memory-site/site-footer'
import { SiteHero } from '@/components/memory-site/site-hero'
import { MemorySiteReveal } from '@/components/memory-site/memory-site-reveal'
import { SiteSection } from '@/components/memory-site/site-section'
import { buildMemorySitePreviewModel, type MemorySitePageSectionModel } from '@/lib/memory-sites/site-page-model'
import { getPublishedMemorySiteByCoupleId } from '@/lib/memory-sites/site-queries'
import { getPublicSpacePageDataBySlug, resolvePublicMetadata } from '@/lib/public-metadata'
import { buildPublicSpaceHomePath } from '@/lib/public-routes'

type MemorySitePageRecord = {
  title: string
  subtitle: string | null
  intro: string
  closing: string
  coverPhotoUrl: string | null
  payload: {
      style: string
      sections: Array<{
        chapterId: string
        title: string
        summary: string
        photos: MemorySitePageSectionModel['photos']
      }>
    }
}

export function buildMemorySiteShellClassName() {
  return 'vp-memory-site-shell min-h-screen bg-[var(--vp-bg-light)] text-[var(--vp-text-light)]'
}

export function buildMemorySitePageModel(site: MemorySitePageRecord) {
  return buildMemorySitePreviewModel(site)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return resolvePublicMetadata({ slug, page: 'site' })
}

export default async function PublicMemorySitePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const space = await getPublicSpacePageDataBySlug(slug)

  if (!space || !space.isPublic) {
    notFound()
  }

  const site = await getPublishedMemorySiteByCoupleId(space.id)
  if (!site) {
    notFound()
  }

  const model = buildMemorySitePreviewModel(site as MemorySitePageRecord)

  return (
    <main className={buildMemorySiteShellClassName()}>
      <SiteHero
        model={{
          title: model.title,
          subtitle: model.subtitle,
          intro: model.intro,
          coverPhotoUrl: model.coverPhotoUrl,
          slug,
        }}
        backHref={buildPublicSpaceHomePath(slug)}
        backLabel="Back home"
      />
      <div className="mx-auto flex w-full max-w-[var(--vp-memory-site-max-width)] flex-col gap-12 px-6 pb-24 pt-12">
        {model.sections.map(section => (
          <MemorySiteReveal key={section.chapterId} stagger="children">
            <SiteSection section={section} />
          </MemorySiteReveal>
        ))}
        <MemorySiteReveal stagger="children">
          <SiteFooter closing={model.closing} ctaHref={buildPublicSpaceHomePath(slug)} ctaLabel="More memories" />
        </MemorySiteReveal>
      </div>
    </main>
  )
}
