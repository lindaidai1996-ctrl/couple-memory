'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRightIcon, Button, EditIcon, RefreshIcon, XIcon, buttonClassName } from '@/components/ui/button'
import type { PhotoData } from './photo-card'
import { PhotoContextForm } from './photo-context-form'

type Translator = (key: string) => string

export const photoDetailImageSurfaceClass = 'bg-warm-skeleton-base'

export function formatPhotoTakenAt(takenAt: string | null, locale: string) {
  if (!takenAt) return '-'

  const date = new Date(takenAt)
  if (Number.isNaN(date.getTime())) return '-'
  if (date.getTime() > Date.now()) return '-'

  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function buildPhotoDetailCopy(t: Translator) {
  return {
    tabs: {
      info: t('infoTab'),
      assist: t('editTab'),
      exif: t('exifTab'),
    },
  }
}

export function buildPhotoAssistMeta({
  chapterId,
}: {
  chapterId: string | null | undefined
}) {
  return {
    isGrouped: Boolean(chapterId),
    assistTabKey: 'assist' as const,
    showLayoutEditorAsSecondary: true,
  }
}

export function buildPhotoPreviewNavigationState({
  currentPhotoId,
  chapterPhotoIds,
}: {
  currentPhotoId: string
  chapterPhotoIds: string[]
}) {
  const currentIndex = chapterPhotoIds.indexOf(currentPhotoId)
  const previousPhotoId = currentIndex > 0 ? chapterPhotoIds[currentIndex - 1] : null
  const nextPhotoId =
    currentIndex >= 0 && currentIndex < chapterPhotoIds.length - 1
      ? chapterPhotoIds[currentIndex + 1]
      : null

  return {
    hasPrevious: previousPhotoId !== null,
    hasNext: nextPhotoId !== null,
    previousPhotoId,
    nextPhotoId,
  }
}

export function buildPhotoRetryRequestInit(): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope: 'FULL' }),
  }
}

export function PhotoDetailModal({
  photo,
  coupleId,
  chapterPhotoIds = [],
  onNavigate,
  onClose,
  onUpdated,
  onSetCover,
}: {
  photo: PhotoData
  coupleId: string
  chapterPhotoIds?: string[]
  onNavigate?: (photoId: string) => void
  onClose: () => void
  onUpdated: () => void
  onSetCover?: (photoId: string) => Promise<void> | void
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
  const [tab, setTab] = useState<'info' | 'assist' | 'exif'>('info')
  const [caption, setCaption] = useState(photo.userCaption || photo.aiCaption || '')
  const [layout, setLayout] = useState(photo.aiLayout || 'side-by-side')
  const [momentContext, setMomentContext] = useState(photo.momentContext || '')
  const [momentPromptAnswer, setMomentPromptAnswer] = useState(photo.momentPromptAnswer || '')
  const [saving, setSaving] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [settingCover, setSettingCover] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft' && navigation.previousPhotoId && onNavigate) {
        event.preventDefault()
        onNavigate(navigation.previousPhotoId)
      }

      if (event.key === 'ArrowRight' && navigation.nextPhotoId && onNavigate) {
        event.preventDefault()
        onNavigate(navigation.nextPhotoId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigation.nextPhotoId, navigation.previousPhotoId, onNavigate])

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
    onUpdated()
  }

  async function handleRetry() {
    setRetrying(true)
    await fetch(`/api/couples/${coupleId}/photos/${photo.id}/retry`, buildPhotoRetryRequestInit())
    setRetrying(false)
    onUpdated()
  }

  async function handleSetCover() {
    if (!onSetCover) return
    setSettingCover(true)
    await onSetCover(photo.id)
    setSettingCover(false)
    onUpdated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-warm-surface rounded-[var(--radius-xl)] shadow-2xl
        max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">

        {/* 图片区 */}
        <div className={`relative ${photoDetailImageSurfaceClass} flex-shrink-0`}>
          {navigation.hasPrevious && onNavigate ? (
            <Button
              type="button"
              onClick={() => onNavigate(navigation.previousPhotoId!)}
              aria-label={t('previousPhoto')}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 bg-black/40 text-white hover:bg-black/60"
              variant="ghost"
              size="xs"
              iconOnly
            >
              <ArrowRightIcon className="-scale-x-100" />
            </Button>
          ) : null}

          {navigation.hasNext && onNavigate ? (
            <Button
              type="button"
              onClick={() => onNavigate(navigation.nextPhotoId!)}
              aria-label={t('nextPhoto')}
              className="absolute right-14 top-1/2 z-10 -translate-y-1/2 bg-black/40 text-white hover:bg-black/60"
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
              className="w-full max-h-[50vh] object-contain"
            />
          ) : (
            <div className="w-full h-48 flex items-center justify-center text-warm-muted">
              {t('noPreview')}
            </div>
          )}
          <Button
            onClick={onClose}
            aria-label={t('close')}
            className="absolute top-3 right-3 bg-black/40 text-white hover:bg-black/60"
            variant="ghost"
            size="xs"
            iconOnly
          >
            <XIcon />
          </Button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-warm-border px-5">
          {([
            ['info', copy.tabs.info],
            ['assist', copy.tabs.assist],
            ['exif', copy.tabs.exif],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`${buttonClassName({
                size: 'sm',
                variant: tab === key ? 'subtle' : 'ghost',
                className: 'h-auto rounded-none border-b-2 px-4 py-3 text-sm font-medium shadow-none',
              })} 
                ${tab === key
                  ? 'border-warm-accent text-warm-accent'
                  : 'border-transparent text-warm-muted hover:text-warm-text'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'info' && (
            <div className="space-y-3">
              <InfoRow label={t('caption')} value={photo.userCaption || photo.aiCaption || '-'} />
              <InfoRow label={t('layout')} value={layoutOptions.find(l => l.value === photo.aiLayout)?.label || '-'} />
              <InfoRow label={t('scene')} value={photo.aiScene || '-'} />
              <InfoRow label={t('mood')} value={photo.aiMood || '-'} />
              <InfoRow label={t('location')} value={photo.locationName || '-'} />
              <InfoRow
                label={t('time')}
                value={formatPhotoTakenAt(photo.takenAt, locale)}
              />
              <InfoRow label={t('status')} value={
                photo.status === 'READY' ? t('ready') :
                photo.status === 'PROCESSING' ? t('processing') : t('failed')
              } />

              {photo.status === 'FAILED' && (
                <Button
                  onClick={handleRetry}
                  loading={retrying}
                  variant="brand"
                  leadingIcon={<RefreshIcon />}
                  className="mt-2"
                >
                  {retrying ? t('retrying') : t('retry')}
                </Button>
              )}

              {photo.status === 'READY' && photo.canBeCover && onSetCover && (
                <Button
                  onClick={handleSetCover}
                  disabled={settingCover || photo.isAlbumCover}
                  loading={settingCover}
                  variant={photo.isAlbumCover ? 'subtle' : 'secondary'}
                  leadingIcon={!photo.isAlbumCover ? <EditIcon /> : undefined}
                  className="mt-2"
                >
                  {photo.isAlbumCover ? t('coverCurrent') : settingCover ? t('coverSetting') : t('coverSet')}
                </Button>
              )}
            </div>
          )}

          {tab === 'assist' && (
            <div className="space-y-4">
              <p className="text-sm text-warm-muted">
                {assistMeta.isGrouped
                  ? '这张照片已经属于某个章节。这里更适合补充它在这段回忆里的具体意义。'
                  : '这张照片还没有整理进章节。你可以先补一句背景，让 AI 帮你留住这个瞬间。'}
              </p>

              <PhotoContextForm
                momentContext={momentContext}
                momentPromptAnswer={momentPromptAnswer}
                onMomentContextChange={setMomentContext}
                onMomentPromptAnswerChange={setMomentPromptAnswer}
              />

              <div>
                <label className="block text-sm font-medium text-warm-text mb-1.5">{t('caption')}</label>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-warm-border
                    bg-warm-bg text-warm-text text-sm resize-none
                    focus:ring-2 focus:ring-warm-accent/30 focus:border-warm-accent outline-none"
                  placeholder={t('captionPlaceholder')}
                />
              </div>

              {assistMeta.showLayoutEditorAsSecondary ? (
                <details className="rounded-[var(--radius-md)] border border-warm-border bg-warm-bg p-3">
                  <summary className="cursor-pointer text-sm font-medium text-warm-text">{t('layoutTemplate')}</summary>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                    {layoutOptions.map(opt => (
                      <Button
                        key={opt.value}
                        size="sm"
                        onClick={() => setLayout(opt.value)}
                        variant={layout === opt.value ? 'subtle' : 'ghost'}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </details>
              ) : null}

              <Button
                onClick={handleSave}
                loading={saving}
                variant="brand"
                leadingIcon={<ArrowRightIcon />}
              >
                {saving ? t('saving') : t('save')}
              </Button>
            </div>
          )}

          {tab === 'exif' && (
            <div className="space-y-3">
              <InfoRow label={t('camera')} value={
                [photo.cameraMake, photo.cameraModel].filter(Boolean).join(' ') || '-'
              } />
              <InfoRow label={t('focalLength')} value={photo.focalLength || '-'} />
              <InfoRow label={t('aperture')} value={photo.aperture || '-'} />
              <InfoRow label={t('shutterSpeed')} value={photo.shutterSpeed || '-'} />
              <InfoRow label="ISO" value={photo.iso?.toString() || '-'} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-sm text-warm-muted w-16 flex-shrink-0">{label}</span>
      <span className="text-sm text-warm-text">{value}</span>
    </div>
  )
}
