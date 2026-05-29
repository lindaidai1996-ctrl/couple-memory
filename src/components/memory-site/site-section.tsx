import type { CSSProperties } from 'react'

import type { MemorySitePhotoRecord } from '@/lib/memory-sites/site-builder'

export type MemorySiteSectionModel = {
  chapterId: string
  kicker: string
  title: string
  summary: string
  layout: 'imageLeft' | 'imageRight'
  photos: MemorySitePhotoRecord[]
}

function siteSectionGridClassName(layout: MemorySiteSectionModel['layout']) {
  return layout === 'imageLeft'
    ? 'grid gap-6 md:grid-cols-[1.2fr_0.8fr]'
    : 'grid gap-6 md:grid-cols-[0.8fr_1.2fr]'
}

export function SiteSection({ section }: { section: MemorySiteSectionModel }) {
  const heroPhoto = section.photos[0]
  const childRevealStyle = { ['--memory-site-reveal-delay' as const]: '80ms' } as CSSProperties
  const detailRevealStyle = { ['--memory-site-reveal-delay' as const]: '160ms' } as CSSProperties

  return (
    <section className="rounded-[var(--vp-radius-xl)] border border-[var(--vp-border-light)] bg-[var(--vp-panel-light)] p-[clamp(18px,2vw,28px)] shadow-[var(--vp-shadow-soft)] backdrop-blur-sm">
      <div className={siteSectionGridClassName(section.layout)}>
        <div
          data-memory-site-reveal-child
          style={childRevealStyle}
          className={`overflow-hidden rounded-[var(--vp-radius-lg)] ${section.layout === 'imageRight' ? 'md:order-2' : ''}`}
        >
          {heroPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroPhoto.imageUrl}
              alt={section.title}
              className="h-full min-h-[320px] w-full object-cover"
            />
          ) : null}
        </div>

        <div
          data-memory-site-reveal-child
          style={childRevealStyle}
          className={`${section.layout === 'imageRight' ? 'md:order-1' : ''} space-y-4`}
        >
          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--vp-text-soft-light)]">{section.kicker}</p>
          <h2
            className="text-[clamp(28px,3.2vw,42px)] leading-none tracking-[-0.04em] text-[var(--vp-text-light)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {section.title}
          </h2>
          <p className="text-[13px] leading-[1.7] text-[var(--vp-text-soft-light)]">{section.summary}</p>

          <div className="grid gap-3 pt-2">
            {section.photos.slice(1, 4).map(photo => (
              <article
                key={photo.id}
                data-memory-site-reveal-child
                style={detailRevealStyle}
                className="rounded-[18px] border border-[var(--vp-border-light)] bg-white/44 p-3"
              >
                <p className="text-sm leading-6 text-[var(--vp-text-light)]">{photo.narrative}</p>
                {(photo.locationName || photo.takenAt) ? (
                  <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-[var(--vp-text-soft-light)]">
                    {[photo.locationName, photo.takenAt?.slice(0, 10)].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
