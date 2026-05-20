'use client'

import { useTranslations } from 'next-intl'

export interface PhotoData {
  id: string
  fileName: string
  thumbnailUrl: string | null
  displayUrl: string | null
  status: string
  aiCaption: string | null
  userCaption: string | null
  takenAt: string | null
  locationName: string | null
  aiLayout: string | null
  selectedCaptionSource?: string | null
  selectedLayoutSource?: string | null
  captionVariants?: Array<{
    id: string
    content: string
    style?: string | null
    isSelected: boolean
  }>
  layoutVariants?: Array<{
    id: string
    content: string
    reason?: string | null
    isSelected: boolean
  }>
  aiScene: string | null
  aiMood: string | null
  cameraMake: string | null
  cameraModel: string | null
  focalLength: string | null
  aperture: string | null
  shutterSpeed: string | null
  iso: number | null
  isAlbumCover?: boolean
  canBeCover?: boolean
}

type Translator = (key: string) => string

export const photoCardSurfaceClass = 'bg-warm-skeleton-base'

export function buildPhotoCardStatusCopy(t: Translator) {
  return {
    processing: t('processing'),
    noPreview: t('noPreview'),
    processingShort: t('processingShort'),
    failed: t('failed'),
  }
}

export function PhotoCard({ photo, onClick }: { photo: PhotoData; onClick: () => void }) {
  const t = useTranslations('PhotoCard')
  const copy = buildPhotoCardStatusCopy(t)

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer rounded-[var(--radius-md)] overflow-hidden group
        ${photoCardSurfaceClass} aspect-square`}
    >
      {photo.thumbnailUrl ? (
        <img
          src={photo.thumbnailUrl}
          alt={photo.fileName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-warm-muted text-xs">
            {photo.status === 'PROCESSING' ? copy.processing : copy.noPreview}
          </span>
        </div>
      )}

      {photo.status !== 'READY' && (
        <StatusBadge status={photo.status} processingLabel={copy.processingShort} failedLabel={copy.failed} />
      )}

      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/50 to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <p className="text-white text-xs truncate">
          {photo.userCaption || photo.aiCaption || photo.fileName}
        </p>
      </div>
    </div>
  )
}

function StatusBadge({
  status,
  processingLabel,
  failedLabel,
}: {
  status: string
  processingLabel: string
  failedLabel: string
}) {
  const config = status === 'PROCESSING'
    ? { bg: 'bg-info', label: processingLabel }
    : { bg: 'bg-error', label: failedLabel }

  return (
    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${config.bg}`}>
      {config.label}
    </div>
  )
}
