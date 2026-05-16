'use client'

import type { LayoutProps } from './cinema-wide'
import { useLocale, useTranslations } from 'next-intl'

export function StoryCard({ photo, caption }: LayoutProps) {
  const t = useTranslations('Layout')
  const locale = useLocale()
  const src = photo.displayUrl || photo.thumbnailUrl

  return (
    <div className="max-w-lg mx-auto bg-film-surface rounded-[var(--radius-xl)]
      shadow-lg shadow-black/30 overflow-hidden">
      {/* 图片区域 */}
      <div className="relative aspect-[4/5] overflow-hidden">
        {src ? (
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
      </div>

      {/* 文字区域 */}
      <div className="p-5 md:p-6">
        {caption && (
          <p className="text-film-text text-sm leading-relaxed mb-3">
            {caption}
          </p>
        )}
        <div className="flex items-center justify-between text-film-muted text-xs">
          <span>{photo.locationName || ''}</span>
          {photo.takenAt && (
            <time dateTime={photo.takenAt}>
              {new Date(photo.takenAt).toLocaleDateString(locale)}
            </time>
          )}
        </div>
        {photo.aiMood && (
          <span className="inline-block mt-3 px-3 py-1 text-[10px] text-film-accent
            border border-film-accent/30 rounded-full">
            {photo.aiMood}
          </span>
        )}
      </div>
    </div>
  )
}
