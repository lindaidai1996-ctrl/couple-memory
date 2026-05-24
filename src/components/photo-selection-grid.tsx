import { mediaTileButtonClassName } from '@/components/ui/media-tile'
import { photoCardSurfaceClass, type PhotoData } from './photo-card'

export function buildPhotoSelectionTileClassName() {
  return mediaTileButtonClassName({
    className: `relative aspect-square overflow-hidden rounded-[var(--radius-md)] ${photoCardSurfaceClass} text-left`,
  })
}

export function PhotoSelectionGrid({
  photos,
  selectedIds,
  selectionMode,
  onToggle,
  onOpen,
}: {
  photos: PhotoData[]
  selectedIds: string[]
  selectionMode: boolean
  onToggle: (photoId: string) => void
  onOpen: (photo: PhotoData) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {photos.map(photo => {
        const selected = selectedIds.includes(photo.id)

        return (
          <button
            key={photo.id}
            type="button"
            onClick={() => selectionMode ? onToggle(photo.id) : onOpen(photo)}
            className={buildPhotoSelectionTileClassName()}
          >
            {photo.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.thumbnailUrl}
                alt={photo.fileName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-warm-muted text-xs">
                {photo.status === 'PROCESSING' ? '处理中' : '无预览'}
              </div>
            )}

            {selectionMode ? (
              <div className="absolute left-2 top-2">
                <div className={`w-5 h-5 rounded-full border-2 transition-colors ${
                  selected
                    ? 'bg-warm-accent border-warm-accent'
                    : 'bg-white/80 border-white'
                }`} />
              </div>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
