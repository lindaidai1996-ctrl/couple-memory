'use client'

import type { LayoutProps } from './cinema-wide'
import { useLocale, useTranslations } from 'next-intl'

export function SideBySide({ photo, caption, index = 0 }: LayoutProps) {
  const t = useTranslations('Layout')
  const locale = useLocale()
  const src = photo.displayUrl || photo.thumbnailUrl
  const flipped = index % 2 === 1

  const imageBlock = (
    <div className="relative aspect-[4/3] md:aspect-auto md:flex-1 overflow-hidden
      rounded-[var(--radius-md)]">
      {src ? (
        <img
          src={src}
          alt={caption || ''}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-film-surface flex items-center justify-center min-h-[240px]">
          <span className="text-film-muted text-sm">{t('noImage')}</span>
        </div>
      )}
    </div>
  )

  const textBlock = (
    <div className="flex-1 flex flex-col justify-center py-4 md:py-0 md:px-8">
      {caption && (
        <p className="text-film-text text-sm md:text-base leading-relaxed mb-4">
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
      {photo.aiMood && (
        <span className="mt-3 text-film-accent text-xs tracking-wider">
          {photo.aiMood}
        </span>
      )}
    </div>
  )

  return (
    <div className={`flex flex-col md:flex-row gap-4 items-stretch ${flipped ? 'md:flex-row-reverse' : ''}`}>
      {imageBlock}
      {textBlock}
    </div>
  )
}
