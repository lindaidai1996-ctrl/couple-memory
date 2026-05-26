import { mediaTileButtonClassName } from '@/components/ui/media-tile'
import { CheckIcon, EyeIcon, ScreenIcon, TrashIcon } from '@/components/ui/button'
import { canUsePhotoAsAlbumCover, photoCardSurfaceClass, type PhotoData } from './photo-card'
import {
  PhotoHoverOverlay,
  buildPhotoHoverActionButtonClassName,
  buildPhotoHoverIndicatorClassName,
} from './photo-hover-overlay'

export function buildPhotoSelectionTileClassName() {
  return mediaTileButtonClassName({
    className: `relative aspect-square overflow-hidden rounded-none ${photoCardSurfaceClass} text-left`,
  })
}

export function buildPhotoSelectionCheckboxClassName(selected: boolean) {
  return [
    'cm-photo-selection-checkbox',
    'pointer-events-none relative flex h-[32px] w-[32px] items-center justify-center rounded-[10px] border bg-transparent shadow-none transition-all duration-200',
    selected ? 'cm-photo-selection-checkbox--selected' : 'cm-photo-selection-checkbox--idle',
    selected
      ? 'border-[rgba(255,250,252,0.34)]'
      : 'border-[rgba(255,251,253,0.44)]',
  ].join(' ')
}

export function buildPhotoSelectionCheckmarkClassName(selected: boolean) {
  return [
    'cm-photo-selection-checkbox__check',
    'relative z-[2] h-[13px] w-[13px] text-white transition duration-200',
    selected ? 'cm-photo-selection-checkbox__check--visible' : 'cm-photo-selection-checkbox__check--hidden',
    selected ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
  ].join(' ')
}

export function buildPhotoSelectionDotClassName(selected: boolean) {
  return [
    'cm-photo-selection-checkbox__dot',
    'absolute z-[2] h-[2px] w-[10px] rounded-full transition duration-200',
    selected
      ? 'scale-0 opacity-0'
      : 'scale-100 opacity-100 bg-[rgba(111,79,102,0.62)]',
  ].join(' ')
}

export function buildPhotoSelectionCheckboxInnerClassName(selected: boolean) {
  return [
    'cm-photo-selection-checkbox__inner',
    'absolute inset-[4px] rounded-[7px] border transition duration-200',
    selected
      ? 'border-[rgba(255,250,252,0.22)] bg-[linear-gradient(135deg,#5b3a52_0%,#9d7084_55%,#e7c9c5_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]'
      : 'border-[rgba(255,251,253,0.82)] bg-[linear-gradient(180deg,rgba(255,252,253,0.9),rgba(246,239,243,0.82))] shadow-[0_1px_2px_rgba(34,22,29,0.08),inset_0_1px_0_rgba(255,255,255,0.72)]',
  ].join(' ')
}

export function buildPhotoSelectionOverlayClassName(selected: boolean) {
  return [
    'cm-photo-selection-overlay',
    'pointer-events-none absolute inset-0 rounded-none transition duration-200',
    selected
      ? 'border border-[rgba(231,201,197,0.52)] bg-[linear-gradient(180deg,rgba(91,58,82,0.14),rgba(91,58,82,0.24))] shadow-[inset_0_0_0_1px_rgba(255,251,253,0.08)] opacity-100'
      : 'opacity-0',
  ].join(' ')
}

export function buildAlbumPhotoPreviewItems(photos: Array<Pick<PhotoData, 'id' | 'displayUrl' | 'fileName'>>) {
  return photos
    .filter(photo => Boolean(photo.displayUrl))
    .map(photo => ({
      id: photo.id,
      src: photo.displayUrl!,
      alt: photo.fileName,
      title: photo.fileName,
    }))
}

export function PhotoSelectionGrid({
  photos,
  selectedIds,
  selectionMode,
  onToggle,
  onOpen,
  onPreviewPhoto,
  onDeletePhoto,
  onRequestSetCover,
  photoActionCopy,
  deletingPhotoId = null,
  settingCoverPhotoId = null,
}: {
  photos: PhotoData[]
  selectedIds: string[]
  selectionMode: boolean
  onToggle: (photoId: string) => void
  onOpen: (photo: PhotoData) => void
  onPreviewPhoto?: (photoId: string) => void
  onDeletePhoto?: (photoId: string) => void
  onRequestSetCover?: (photoId: string) => void
  photoActionCopy?: {
    previewPhoto?: string
    deletePhoto: string
    deletingPhoto: string
    setAsCover: string
    settingCover: string
    currentCover: string
  }
  deletingPhotoId?: string | null
  settingCoverPhotoId?: string | null
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {photos.map(photo => {
        const selected = selectedIds.includes(photo.id)
        const showDeleteAction = !selectionMode && Boolean(onDeletePhoto) && Boolean(photoActionCopy)
        const showPreviewAction =
          !selectionMode &&
          Boolean(onPreviewPhoto) &&
          Boolean(photoActionCopy?.previewPhoto) &&
          Boolean(photo.displayUrl)
        const showCoverAction = !selectionMode && Boolean(onRequestSetCover) && Boolean(photoActionCopy)
        const isDeleting = deletingPhotoId === photo.id
        const canSetCover = canUsePhotoAsAlbumCover(photo)
        const isCurrentCover = Boolean(photo.isAlbumCover)
        const shouldShowCoverAction = showCoverAction && canSetCover && !isCurrentCover
        const isSettingCover = settingCoverPhotoId === photo.id

        return (
          <div key={photo.id} className={buildPhotoSelectionTileClassName()}>
            <button
              type="button"
              onClick={() => selectionMode ? onToggle(photo.id) : onOpen(photo)}
              className="absolute inset-0 z-0 cursor-pointer"
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
            </button>

            {selectionMode ? (
              <div className={buildPhotoSelectionOverlayClassName(selected)} aria-hidden="true" />
            ) : null}

            {selectionMode ? (
              <div className="absolute left-2 top-2 z-10">
                <div className={buildPhotoSelectionCheckboxClassName(selected)} aria-hidden="true">
                  <span className={buildPhotoSelectionCheckboxInnerClassName(selected)} />
                  <span className={buildPhotoSelectionDotClassName(selected)} />
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    className={buildPhotoSelectionCheckmarkClassName(selected)}
                  >
                    <path
                      d="M3.5 8.2 6.4 11l6.1-6.2"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            ) : null}

            {showDeleteAction || shouldShowCoverAction || showPreviewAction ? (
              <PhotoHoverOverlay
                topSlot={shouldShowCoverAction ? (
                  <button
                    type="button"
                    aria-label={isSettingCover ? photoActionCopy!.settingCover : photoActionCopy!.setAsCover}
                    title={isSettingCover ? photoActionCopy!.settingCover : photoActionCopy!.setAsCover}
                    className={buildPhotoHoverActionButtonClassName()}
                    disabled={isSettingCover}
                    onClick={event => {
                      event.stopPropagation()
                      onRequestSetCover?.(photo.id)
                    }}
                  >
                    <ScreenIcon className="h-4 w-4" />
                  </button>
                ) : null}
                bottomSlot={(
                  showDeleteAction || showPreviewAction ? (
                    <div className="flex items-center gap-2">
                      {showPreviewAction ? (
                        <button
                          type="button"
                          aria-label={photoActionCopy!.previewPhoto}
                          title={photoActionCopy!.previewPhoto}
                          className={buildPhotoHoverActionButtonClassName()}
                          onClick={event => {
                            event.stopPropagation()
                            onPreviewPhoto?.(photo.id)
                          }}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      ) : null}
                      {showDeleteAction ? (
                        <button
                          type="button"
                          aria-label={isDeleting ? photoActionCopy!.deletingPhoto : photoActionCopy!.deletePhoto}
                          title={isDeleting ? photoActionCopy!.deletingPhoto : photoActionCopy!.deletePhoto}
                          className={buildPhotoHoverActionButtonClassName()}
                          disabled={isDeleting}
                          onClick={event => {
                            event.stopPropagation()
                            onDeletePhoto?.(photo.id)
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  ) : null
                )}
              />
            ) : null}

            {!selectionMode && isCurrentCover ? (
              <div className="pointer-events-none absolute left-2.5 top-2.5 z-20">
                <span
                  aria-label={photoActionCopy?.currentCover ?? '当前封面'}
                  className={buildPhotoHoverIndicatorClassName()}
                >
                  <CheckIcon className="h-4 w-4" />
                  <span>{photoActionCopy?.currentCover ?? '当前封面'}</span>
                </span>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
