import { Button, CheckIcon, EditIcon, RefreshIcon, ScreenIcon, SparklesIcon, TrashIcon } from '@/components/ui/button'
import { mediaTileButtonClassName } from '@/components/ui/media-tile'
import { canUsePhotoAsAlbumCover, type PhotoData } from './photo-card'
import { PhotoHoverOverlay, buildPhotoHoverActionButtonClassName } from './photo-hover-overlay'
import {
  buildPhotoSelectionCheckboxClassName,
  buildPhotoSelectionCheckmarkClassName,
  buildPhotoSelectionCheckboxInnerClassName,
  buildPhotoSelectionDotClassName,
  buildPhotoSelectionOverlayClassName,
} from './photo-selection-grid'

export type AlbumChapterCardData = {
  id: string
  title: string
  backgroundNote: string | null
  aiSummary?: string | null
  sortOrder?: number
  photos: PhotoData[]
}

export function buildAlbumChapterCardMeta(chapter: {
  title: string
  backgroundNote: string | null
  aiSummary?: string | null
  photos: Array<{ id: string }>
}) {
  return {
    photoCount: chapter.photos.length,
    previewCount: Math.min(chapter.photos.length, 4),
    hasSummary: Boolean(chapter.aiSummary),
  }
}

export type AlbumChapterCardCopy = {
  photoCount: string
  editChapter: string
  refreshSummary: string
  generateSummary: string
  refreshingSummary: string
  generatingSummary: string
}

export function buildSummaryActionState({
  hasSummary,
  isRefreshing,
  copy,
}: {
  hasSummary: boolean
  isRefreshing: boolean
  copy: Pick<AlbumChapterCardCopy, 'refreshSummary' | 'generateSummary' | 'refreshingSummary' | 'generatingSummary'>
}) {
  if (isRefreshing) {
    return {
      label: hasSummary ? copy.refreshingSummary : copy.generatingSummary,
      disabled: true,
    }
  }

  return {
    label: hasSummary ? copy.refreshSummary : copy.generateSummary,
    disabled: false,
  }
}

export function buildAlbumChapterPreviewTileClassName() {
  return mediaTileButtonClassName({
    className: 'relative aspect-square overflow-hidden rounded-none bg-warm-skeleton-base',
  })
}

export function buildAlbumChapterCardSelectionState({
  selectionMode,
  selectedIds,
  photoId,
}: {
  selectionMode: boolean
  selectedIds: string[]
  photoId: string
}) {
  const selected = selectionMode ? selectedIds.includes(photoId) : false

  return {
    interactive: selectionMode,
    selected,
    showSelectionBadge: selectionMode,
    showActions: !selectionMode,
  }
}

export function AlbumChapterCard({
  chapter,
  copy,
  onOpenPhoto,
  onTogglePhotoSelection,
  onDeletePhoto,
  onRequestSetCover,
  onEditChapter,
  onRefreshSummary,
  isRefreshingSummary = false,
  selectionMode = false,
  selectedPhotoIds = [],
  photoActionCopy,
  deletingPhotoId = null,
  settingCoverPhotoId = null,
}: {
  chapter: AlbumChapterCardData
  copy: AlbumChapterCardCopy
  onOpenPhoto?: (photo: PhotoData) => void
  onTogglePhotoSelection?: (photoId: string) => void
  onDeletePhoto?: (photoId: string) => void
  onRequestSetCover?: (photoId: string) => void
  onEditChapter?: () => void
  onRefreshSummary?: () => void
  isRefreshingSummary?: boolean
  selectionMode?: boolean
  selectedPhotoIds?: string[]
  photoActionCopy?: {
    deletePhoto: string
    deletingPhoto: string
    setAsCover: string
    settingCover: string
    currentCover: string
  }
  deletingPhotoId?: string | null
  settingCoverPhotoId?: string | null
}) {
  const meta = buildAlbumChapterCardMeta(chapter)
  const previewPhotos = chapter.photos.slice(0, 4)
  const summaryAction = buildSummaryActionState({
    hasSummary: meta.hasSummary,
    isRefreshing: isRefreshingSummary,
    copy,
  })

  return (
    <section className="rounded-[var(--radius-lg)] border border-warm-border bg-warm-surface p-5 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-warm-text">{chapter.title}</h2>
        {chapter.backgroundNote ? (
          <p className="text-sm text-warm-muted">{chapter.backgroundNote}</p>
        ) : null}
      </div>

      {chapter.aiSummary ? (
        <p className="text-sm text-warm-text leading-6">{chapter.aiSummary}</p>
      ) : null}

      {previewPhotos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {previewPhotos.map(photo => (
            (() => {
              const selectionState = buildAlbumChapterCardSelectionState({
                selectionMode,
                selectedIds: selectedPhotoIds,
                photoId: photo.id,
              })
              const canSetCover = canUsePhotoAsAlbumCover(photo)
              const isCurrentCover = Boolean(photo.isAlbumCover)
              const isSettingCover = settingCoverPhotoId === photo.id
              const shouldShowDeleteAction = !selectionMode && Boolean(onDeletePhoto) && Boolean(photoActionCopy)
              const shouldShowCoverAction = !selectionMode && Boolean(onRequestSetCover) && Boolean(photoActionCopy) && (canSetCover || isCurrentCover)

              return (
                <div key={photo.id} className={buildAlbumChapterPreviewTileClassName()}>
                  <button
                    type="button"
                    onClick={() => selectionState.interactive ? onTogglePhotoSelection?.(photo.id) : onOpenPhoto?.(photo)}
                    className="absolute inset-0 z-0 cursor-pointer"
                  >
                    {photo.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </button>

                  {selectionState.showSelectionBadge ? (
                    <div className={buildPhotoSelectionOverlayClassName(selectionState.selected)} aria-hidden="true" />
                  ) : null}

                  {selectionState.showSelectionBadge ? (
                    <div className="absolute left-2 top-2 z-10">
                      <div className={buildPhotoSelectionCheckboxClassName(selectionState.selected)} aria-hidden="true">
                        <span className={buildPhotoSelectionCheckboxInnerClassName(selectionState.selected)} />
                        <span className={buildPhotoSelectionDotClassName(selectionState.selected)} />
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          className={buildPhotoSelectionCheckmarkClassName(selectionState.selected)}
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

                  {shouldShowDeleteAction || shouldShowCoverAction ? (
                    <PhotoHoverOverlay
                      topSlot={shouldShowCoverAction ? (
                        <button
                          type="button"
                          aria-label={
                            isCurrentCover
                              ? photoActionCopy!.currentCover
                              : isSettingCover
                                ? photoActionCopy!.settingCover
                                : photoActionCopy!.setAsCover
                          }
                          title={
                            isCurrentCover
                              ? photoActionCopy!.currentCover
                              : isSettingCover
                                ? photoActionCopy!.settingCover
                                : photoActionCopy!.setAsCover
                          }
                          className={`${buildPhotoHoverActionButtonClassName()} ${isCurrentCover ? 'text-white opacity-100' : ''}`}
                          disabled={isCurrentCover || isSettingCover}
                          onClick={event => {
                            event.stopPropagation()
                            if (!isCurrentCover) {
                              onRequestSetCover?.(photo.id)
                            }
                          }}
                        >
                          {isCurrentCover ? <CheckIcon className="h-4 w-4" /> : <ScreenIcon className="h-4 w-4" />}
                        </button>
                      ) : null}
                      bottomSlot={(
                        shouldShowDeleteAction ? (
                        <button
                          type="button"
                          aria-label={deletingPhotoId === photo.id ? photoActionCopy.deletingPhoto : photoActionCopy.deletePhoto}
                          title={deletingPhotoId === photo.id ? photoActionCopy.deletingPhoto : photoActionCopy.deletePhoto}
                          className={buildPhotoHoverActionButtonClassName()}
                          disabled={deletingPhotoId === photo.id}
                          onClick={event => {
                            event.stopPropagation()
                            onDeletePhoto(photo.id)
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                        ) : null
                      )}
                    />
                  ) : null}
                </div>
              )
            })()
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-warm-muted">{copy.photoCount}</div>
        {!selectionMode ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={<EditIcon />}
              onClick={onEditChapter}
            >
              {copy.editChapter}
            </Button>
            <Button
              size="sm"
              variant={meta.hasSummary ? 'subtle' : 'brand'}
              leadingIcon={meta.hasSummary ? <RefreshIcon /> : <SparklesIcon />}
              onClick={onRefreshSummary}
              disabled={summaryAction.disabled}
              loading={isRefreshingSummary}
            >
              {summaryAction.label}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
