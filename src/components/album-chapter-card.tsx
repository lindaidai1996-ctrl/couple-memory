import { Button, EditIcon, RefreshIcon, SparklesIcon } from '@/components/ui/button'
import { mediaTileButtonClassName } from '@/components/ui/media-tile'
import type { PhotoData } from './photo-card'

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
    className: 'aspect-square overflow-hidden rounded-[var(--radius-md)] bg-warm-skeleton-base',
  })
}

export function AlbumChapterCard({
  chapter,
  copy,
  onOpenPhoto,
  onEditChapter,
  onRefreshSummary,
  isRefreshingSummary = false,
}: {
  chapter: AlbumChapterCardData
  copy: AlbumChapterCardCopy
  onOpenPhoto?: (photo: PhotoData) => void
  onEditChapter?: () => void
  onRefreshSummary?: () => void
  isRefreshingSummary?: boolean
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
            <button
              key={photo.id}
              type="button"
              onClick={() => onOpenPhoto?.(photo)}
              className={buildAlbumChapterPreviewTileClassName()}
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
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-warm-muted">{copy.photoCount}</div>
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
      </div>
    </section>
  )
}
