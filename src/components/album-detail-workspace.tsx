'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRightIcon, Button, EditIcon, RefreshIcon, XIcon } from '@/components/ui/button'
import type { AlbumChapterCardData } from './album-chapter-card'
import { PhotoContextForm } from './photo-context-form'
import type { PhotoData } from './photo-card'
import {
  buildPhotoAssistMeta,
  buildPhotoDetailCopy,
  buildPhotoPreviewNavigationState,
  buildPhotoRetryRequestInit,
  formatPhotoTakenAt,
} from './photo-detail-modal'

type AlbumDetailWorkspaceCopy = {
  emptyTitle: string
  emptyDescription: string
  close: string
  photoTitle: string
  photoDescription: string
  chapterTitle: string
  chapterDescription: string
}

type AlbumDetailWorkspaceState =
  {
    isOpen: boolean
    kind: 'photo' | 'chapter' | null
    activePhoto: PhotoData | null
    activeChapter: AlbumChapterCardData | null
  }

export function buildAlbumDetailWorkspaceHeader({
  kind,
  copy,
}: {
  kind: 'photo' | 'chapter'
  copy: AlbumDetailWorkspaceCopy
}) {
  return {
    title: kind === 'photo' ? copy.photoTitle : copy.chapterTitle,
    description: null,
  }
}

export function AlbumDetailWorkspace({
  state,
  chapterPhotoIds = [],
  copy,
  coupleId,
  onClose,
  onOpenPreview,
  onPhotoNavigate,
  onRefreshData,
  onSetCover,
  onSaveChapter,
}: {
  state: AlbumDetailWorkspaceState
  chapterPhotoIds?: string[]
  copy: AlbumDetailWorkspaceCopy
  coupleId: string
  onClose: () => void
  onOpenPreview: (photoId: string) => void
  onPhotoNavigate: (photoId: string) => void
  onRefreshData: () => void
  onSetCover: (photoId: string) => Promise<void> | void
  onSaveChapter: (chapterId: string, payload: { title: string; backgroundNote: string }) => Promise<void> | void
}) {
  if (!state.isOpen) {
    return (
      <section className="flex min-h-[520px] flex-col overflow-hidden" aria-label={copy.emptyTitle}>
        <div className="flex min-h-[520px] flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warm-bg text-warm-muted">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M4 19h16" />
              <path d="M6 16l3-7a2 2 0 0 1 3.76 0l1.1 2.58a2 2 0 0 0 1.84 1.22H18a2 2 0 0 1 1.79 2.89L19 19" />
            </svg>
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-warm-text">{copy.emptyTitle}</h2>
            <p className="text-sm leading-6 text-warm-muted">{copy.emptyDescription}</p>
          </div>
        </div>
      </section>
    )
  }

  const header = buildAlbumDetailWorkspaceHeader({
    kind: state.kind === 'photo' ? 'photo' : 'chapter',
    copy,
  })

  return (
    <section className="flex h-full flex-col overflow-hidden" aria-label={header.title}>
      <header className="flex items-start justify-between gap-4 border-b border-warm-border px-5 py-4 lg:px-6 lg:py-5">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-warm-text">{header.title}</h2>
        </div>
        <Button
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          variant="ghost"
          size="xs"
          iconOnly
        >
          <XIcon />
        </Button>
      </header>

      {state.kind === 'photo' && state.activePhoto ? (
        <PhotoWorkspacePanel
          key={state.activePhoto.id}
          photo={state.activePhoto}
          coupleId={coupleId}
          chapterPhotoIds={chapterPhotoIds}
          onClose={onClose}
          onOpenPreview={onOpenPreview}
          onNavigate={onPhotoNavigate}
          onRefreshData={onRefreshData}
          onSetCover={onSetCover}
        />
      ) : null}

      {state.kind === 'chapter' && state.activeChapter ? (
        <ChapterWorkspacePanel
          key={state.activeChapter.id}
          chapter={state.activeChapter}
          onClose={onClose}
          onSave={payload => onSaveChapter(state.activeChapter!.id, payload)}
        />
      ) : null}
    </section>
  )
}

function PhotoWorkspacePanel({
  photo,
  coupleId,
  chapterPhotoIds,
  onClose,
  onOpenPreview,
  onNavigate,
  onRefreshData,
  onSetCover,
}: {
  photo: PhotoData
  coupleId: string
  chapterPhotoIds: string[]
  onClose: () => void
  onOpenPreview: (photoId: string) => void
  onNavigate: (photoId: string) => void
  onRefreshData: () => void
  onSetCover: (photoId: string) => Promise<void> | void
}) {
  const t = useTranslations('PhotoDetail')
  const locale = useLocale()
  const copy = buildPhotoDetailCopy(t)
  const assistMeta = buildPhotoAssistMeta({ chapterId: photo.chapterId })
  const navigation = buildPhotoPreviewNavigationState({
    currentPhotoId: photo.id,
    chapterPhotoIds,
  })
  const layoutOptions = [
    { value: 'cinema-wide', label: t('layoutCinemaWide') },
    { value: 'side-by-side', label: t('layoutSideBySide') },
    { value: 'portrait-hero', label: t('layoutPortraitHero') },
    { value: 'grid-square', label: t('layoutGridSquare') },
    { value: 'story-card', label: t('layoutStoryCard') },
  ] as const
  const [caption, setCaption] = useState(photo.userCaption || photo.aiCaption || '')
  const [layout, setLayout] = useState(photo.aiLayout || 'side-by-side')
  const [momentContext, setMomentContext] = useState(photo.momentContext || '')
  const [momentPromptAnswer, setMomentPromptAnswer] = useState(photo.momentPromptAnswer || '')
  const [saving, setSaving] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [settingCover, setSettingCover] = useState(false)

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/couples/${coupleId}/photos/${photo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userCaption: caption,
        aiLayout: layout,
        momentContext,
        momentPromptAnswer,
      }),
    })
    setSaving(false)
    onRefreshData()
  }

  async function handleRetry() {
    setRetrying(true)
    await fetch(`/api/couples/${coupleId}/photos/${photo.id}/retry`, buildPhotoRetryRequestInit())
    setRetrying(false)
    onRefreshData()
  }

  async function handleSetCover() {
    setSettingCover(true)
    await onSetCover(photo.id)
    setSettingCover(false)
    onRefreshData()
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-5">
          <div className="space-y-3">
            <div
              className={`relative overflow-hidden rounded-[22px] border border-warm-border bg-warm-bg ${photo.displayUrl ? 'cursor-zoom-in' : ''}`}
              onClick={photo.displayUrl ? () => onOpenPreview(photo.id) : undefined}
              role={photo.displayUrl ? 'button' : undefined}
              tabIndex={photo.displayUrl ? 0 : undefined}
              onKeyDown={photo.displayUrl ? event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onOpenPreview(photo.id)
                }
              } : undefined}
              aria-label={photo.displayUrl ? t('previewPhoto') : undefined}
            >
              {navigation.hasPrevious ? (
                <Button
                  type="button"
                  onClick={event => {
                    event.stopPropagation()
                    onNavigate(navigation.previousPhotoId!)
                  }}
                  aria-label={t('previousPhoto')}
                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 bg-black/45 text-white hover:bg-black/60"
                  variant="ghost"
                  size="xs"
                  iconOnly
                >
                  <ArrowRightIcon className="-scale-x-100" />
                </Button>
              ) : null}

              {navigation.hasNext ? (
                <Button
                  type="button"
                  onClick={event => {
                    event.stopPropagation()
                    onNavigate(navigation.nextPhotoId!)
                  }}
                  aria-label={t('nextPhoto')}
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 bg-black/45 text-white hover:bg-black/60"
                  variant="ghost"
                  size="xs"
                  iconOnly
                >
                  <ArrowRightIcon />
                </Button>
              ) : null}

              {photo.displayUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.displayUrl}
                  alt={photo.fileName}
                  className="w-full max-h-[34vh] object-contain lg:max-h-[42vh]"
                />
              ) : (
                <div className="flex h-56 items-center justify-center text-sm text-warm-muted">
                  {t('noPreview')}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-warm-text">
                {photo.userCaption || photo.aiCaption || photo.fileName}
              </p>
              <p className="text-xs text-warm-muted">{photo.fileName}</p>
            </div>
          </div>

          <section className="grid gap-3 sm:grid-cols-2">
            <InfoCard label={t('time')} value={formatPhotoTakenAt(photo.takenAt, locale)} />
            <InfoCard label={t('location')} value={photo.locationName || '-'} />
            <InfoCard
              label={t('status')}
              value={
                photo.status === 'READY' ? t('ready') :
                photo.status === 'PROCESSING' ? t('processing') : t('failed')
              }
            />
            <InfoCard label={t('layout')} value={layoutOptions.find(item => item.value === photo.aiLayout)?.label || '-'} />
          </section>

          <section className="space-y-3 rounded-[20px] border border-warm-border bg-warm-bg/60 p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-warm-text">{copy.tabs.assist}</h3>
              <p className="text-sm leading-6 text-warm-muted">
                {assistMeta.isGrouped
                  ? '这张照片已经属于某个章节。这里更适合补充它在这段回忆里的具体意义。'
                  : '这张照片还没有整理进章节。你可以先补一句背景，让 AI 帮你留住这个瞬间。'}
              </p>
            </div>

            <PhotoContextForm
              momentContext={momentContext}
              momentPromptAnswer={momentPromptAnswer}
              onMomentContextChange={setMomentContext}
              onMomentPromptAnswerChange={setMomentPromptAnswer}
            />

            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-warm-text">{t('caption')}</span>
              <textarea
                value={caption}
                onChange={event => setCaption(event.target.value)}
                rows={3}
                className="w-full rounded-[var(--radius-md)] border border-warm-border bg-warm-surface px-4 py-2.5 text-sm text-warm-text resize-none"
                placeholder={t('captionPlaceholder')}
              />
            </label>

            <details className="rounded-[var(--radius-md)] border border-warm-border bg-warm-surface p-3">
              <summary className="cursor-pointer text-sm font-medium text-warm-text">{t('layoutTemplate')}</summary>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {layoutOptions.map(option => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    onClick={() => setLayout(option.value)}
                    variant={layout === option.value ? 'subtle' : 'ghost'}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </details>
          </section>

          <section className="space-y-3 rounded-[20px] border border-warm-border bg-warm-bg/60 p-4">
            <h3 className="text-sm font-semibold text-warm-text">{copy.tabs.exif}</h3>
            <div className="space-y-2">
              <InfoRow label={t('camera')} value={[photo.cameraMake, photo.cameraModel].filter(Boolean).join(' ') || '-'} />
              <InfoRow label={t('focalLength')} value={photo.focalLength || '-'} />
              <InfoRow label={t('aperture')} value={photo.aperture || '-'} />
              <InfoRow label={t('shutterSpeed')} value={photo.shutterSpeed || '-'} />
              <InfoRow label="ISO" value={photo.iso?.toString() || '-'} />
            </div>
          </section>
        </div>
      </div>

      <footer className="border-t border-warm-border bg-warm-surface px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {photo.status === 'FAILED' ? (
            <Button
              type="button"
              onClick={handleRetry}
              loading={retrying}
              variant="secondary"
              leadingIcon={<RefreshIcon />}
            >
              {retrying ? t('retrying') : t('retry')}
            </Button>
          ) : null}

          {photo.status === 'READY' && photo.canBeCover ? (
            <Button
              type="button"
              onClick={handleSetCover}
              disabled={settingCover || photo.isAlbumCover}
              loading={settingCover}
              variant={photo.isAlbumCover ? 'subtle' : 'secondary'}
              leadingIcon={!photo.isAlbumCover ? <EditIcon /> : undefined}
            >
              {photo.isAlbumCover ? t('coverCurrent') : settingCover ? t('coverSetting') : t('coverSet')}
            </Button>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <Button type="button" onClick={onClose} variant="secondary">
              关闭
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              loading={saving}
              variant="brand"
              leadingIcon={<ArrowRightIcon />}
            >
              {saving ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
      </footer>
    </>
  )
}

function ChapterWorkspacePanel({
  chapter,
  onClose,
  onSave,
}: {
  chapter: AlbumChapterCardData
  onClose: () => void
  onSave: (payload: { title: string; backgroundNote: string }) => Promise<void> | void
}) {
  const t = useTranslations('AlbumDetailPage')
  const [title, setTitle] = useState(chapter.title)
  const [backgroundNote, setBackgroundNote] = useState(chapter.backgroundNote ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({
      title: title.trim(),
      backgroundNote: backgroundNote.trim(),
    })
    setSaving(false)
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-5 lg:p-6">
        <div className="space-y-5">
          <section className="space-y-3 rounded-[22px] border border-warm-border bg-warm-bg/60 p-4">
            <h3 className="text-sm font-semibold text-warm-text">{t('detailDrawerTitle')}</h3>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-warm-text">{t('composerChapterTitle')}</span>
              <input
                value={title}
                onChange={event => setTitle(event.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-warm-border bg-warm-surface px-4 py-2.5 text-sm text-warm-text"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-warm-text">{t('composerBackgroundNote')}</span>
              <textarea
                value={backgroundNote}
                onChange={event => setBackgroundNote(event.target.value)}
                rows={5}
                className="w-full rounded-[var(--radius-md)] border border-warm-border bg-warm-surface px-4 py-2.5 text-sm text-warm-text resize-none"
              />
            </label>
          </section>

          <section className="space-y-3 rounded-[22px] border border-warm-border bg-warm-bg/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-warm-text">{t('composerSelectedPhotos')}</h3>
              <span className="text-xs text-warm-muted">{chapter.photos.length} 张</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {chapter.photos.slice(0, 6).map(photo => (
                <div
                  key={photo.id}
                  className="aspect-square overflow-hidden rounded-[var(--radius-md)] bg-warm-skeleton-base"
                >
                  {photo.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.thumbnailUrl} alt={photo.fileName} className="h-full w-full object-cover" />
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <footer className="border-t border-warm-border bg-warm-surface px-5 py-4">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" onClick={onClose} variant="secondary">
            {t('detailDrawerCancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            loading={saving}
            variant="brand"
            leadingIcon={<ArrowRightIcon />}
          >
            {saving ? t('narrativeSavingAlbum') : t('detailDrawerSave')}
          </Button>
        </div>
      </footer>
    </>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-warm-border bg-warm-bg/60 px-4 py-3">
      <div className="text-xs text-warm-muted">{label}</div>
      <div className="mt-1 text-sm font-medium text-warm-text">{value}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-20 flex-shrink-0 text-sm text-warm-muted">{label}</span>
      <span className="text-sm text-warm-text">{value}</span>
    </div>
  )
}
