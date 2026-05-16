'use client'

import type { LayoutProps } from './cinema-wide'
import { useTranslations } from 'next-intl'

export function GridSquare({ photo, caption }: LayoutProps) {
  const t = useTranslations('Layout')
  const src = photo.thumbnailUrl || photo.displayUrl

  return (
    <div className="relative aspect-square overflow-hidden rounded-[var(--radius-md)]
      bg-film-surface group">
      {src ? (
        <img
          src={src}
          alt={caption || ''}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-film-muted text-sm">{t('noImage')}</span>
        </div>
      )}

      {/* hover 时显示文字 */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
        transition-opacity duration-300 flex flex-col justify-end p-3">
        {caption && (
          <p className="text-film-text text-xs leading-relaxed line-clamp-2 mb-1">
            {caption}
          </p>
        )}
        {photo.locationName && (
          <span className="text-film-muted text-[10px]">{photo.locationName}</span>
        )}
      </div>
    </div>
  )
}
