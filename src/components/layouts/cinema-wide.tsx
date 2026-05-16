'use client'

import { useTranslations } from 'next-intl'

export interface LayoutPhotoData {
  id: string
  displayUrl: string | null
  thumbnailUrl: string | null
  width: number | null
  height: number | null
  takenAt: string | null
  locationName: string | null
  aiMood: string | null
}

export interface LayoutProps {
  photo: LayoutPhotoData
  caption: string | null
  index?: number
}

type Translator = (key: string) => string

export function buildLayoutUiText(t: Translator) {
  return {
    noImage: t('noImage'),
  }
}

export function CinemaWide({ photo, caption }: LayoutProps) {
  const t = useTranslations('Layout')
  const copy = buildLayoutUiText(t)
  const src = photo.displayUrl || photo.thumbnailUrl

  return (
    <div className="relative w-full bg-black">
      {/* 上方黑边 */}
      <div className="h-10 md:h-16 bg-black" />

      <div className="relative w-full aspect-[2.39/1] overflow-hidden">
        {src ? (
          <img
            src={src}
            alt={caption || ''}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-film-surface flex items-center justify-center">
            <span className="text-film-muted text-sm">{copy.noImage}</span>
          </div>
        )}

        {/* 底部渐变文字层 */}
        {caption && (
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-10
            bg-gradient-to-t from-black/80 via-black/30 to-transparent">
            <p className="text-film-text text-sm md:text-base max-w-2xl leading-relaxed">
              {caption}
            </p>
            {photo.locationName && (
              <span className="text-film-muted text-xs mt-2 inline-block">
                {photo.locationName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 下方黑边 */}
      <div className="h-10 md:h-16 bg-black" />
    </div>
  )
}
