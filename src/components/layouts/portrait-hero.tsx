'use client'

import type { LayoutProps } from './cinema-wide'
import { useLocale, useTranslations } from 'next-intl'

export function PortraitHero({ photo, caption }: LayoutProps) {
  const t = useTranslations('Layout')
  const locale = useLocale()
  const src = photo.displayUrl || photo.thumbnailUrl

  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-[3/4] overflow-hidden
      rounded-[var(--radius-lg)]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={caption || ''}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-film-surface flex items-center justify-center">
          <span className="text-film-muted text-sm">{t('noImage')}</span>
        </div>
      )}

      {/* 底部渐变标题区域 */}
      <div className="absolute inset-x-0 bottom-0 p-6 md:p-8
        bg-gradient-to-t from-black/70 via-black/30 to-transparent">
        {caption && (
          <p className="text-film-text text-base md:text-lg leading-relaxed mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {caption}
          </p>
        )}
        <div className="flex items-center gap-3 text-film-muted text-xs">
          {photo.locationName && <span>{photo.locationName}</span>}
          {photo.takenAt && (
            <time dateTime={photo.takenAt}>
              {new Date(photo.takenAt).toLocaleDateString(locale)}
            </time>
          )}
        </div>
      </div>
    </div>
  )
}
