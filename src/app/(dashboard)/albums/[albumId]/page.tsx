'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  AlbumChapterCard,
  buildSummaryActionState,
  type AlbumChapterCardData,
} from '@/components/album-chapter-card'
import { AlbumEmptyChapters } from '@/components/album-empty-chapters'
import { ChapterComposerDrawer } from '@/components/chapter-composer-drawer'
import { ChapterDetailDrawer } from '@/components/chapter-detail-drawer'
import { ChapterSelectionToolbar } from '@/components/chapter-selection-toolbar'
import { MoveToChapterDialog } from '@/components/move-to-chapter-dialog'
import { PhotoDetailModal } from '@/components/photo-detail-modal'
import { PhotoSelectionGrid } from '@/components/photo-selection-grid'
import { type PhotoData } from '@/components/photo-card'
import { PhotoUploader } from '@/components/photo-uploader'
import { PhotoGridSkeleton } from '@/components/skeleton/photo-grid-skeleton'

type Photo = PhotoData

interface AlbumDetailResponse {
  id: string
  title: string
  description: string | null
  chapters: AlbumChapterCardData[]
  ungroupedPhotos: Photo[]
}

type Translator = (key: string, values?: Record<string, string | number>) => string

export function buildAlbumDetailUiText(t: Translator) {
  return {
    photoCount: (count: number) => t('photoCount', { count }),
    selectionCount: (count: number) => t('selectionCount', { count }),
    chapterSectionTitle: t('chapterSectionTitle'),
    chapterSectionDescription: t('chapterSectionDescription'),
    organizeAllPhotos: t('organizeAllPhotos'),
    ungroupedSectionTitle: t('ungroupedSectionTitle'),
    ungroupedSectionDescription: t('ungroupedSectionDescription'),
    ungroupedEmpty: t('ungroupedEmpty'),
    createChapter: t('createChapter'),
    cancel: t('cancel'),
    createChapterFailed: t('createChapterFailed'),
    ungroupFailed: t('ungroupFailed'),
    movePhotoFailed: t('movePhotoFailed'),
    saveChapterFailed: t('saveChapterFailed'),
    generateSummaryFailed: t('generateSummaryFailed'),
    summaryUpdated: t('summaryUpdated'),
    narrative: {
      title: t('narrativeTitle'),
      description: t('narrativeDescription'),
      chapterCount: t('narrativeChapterCount'),
      summarizedCount: t('narrativeSummarizedCount'),
      ungroupedCount: t('narrativeUngroupedCount'),
      descriptionReady: t('narrativeDescriptionReady'),
      descriptionMissing: t('narrativeDescriptionMissing'),
      readyHint: t('narrativeReadyHint'),
      needDescriptionHint: t('narrativeNeedDescriptionHint'),
      needOrganizationHint: t('narrativeNeedOrganizationHint'),
    },
    chapterCard: {
      editChapter: t('chapterCardEditChapter'),
      refreshSummary: t('chapterCardRefreshSummary'),
      generateSummary: t('chapterCardGenerateSummary'),
      refreshingSummary: t('chapterCardRefreshingSummary'),
      generatingSummary: t('chapterCardGeneratingSummary'),
    },
    chapterEmpty: {
      title: t('chapterEmptyTitle'),
      description: t('chapterEmptyDescription'),
      action: t('chapterEmptyAction'),
    },
    selectionToolbar: {
      createChapter: t('selectionToolbarCreateChapter'),
      moveToChapter: t('selectionToolbarMoveToChapter'),
      ungroupPhotos: t('selectionToolbarUngroupPhotos'),
      cancel: t('selectionToolbarCancel'),
    },
    composer: {
      title: t('composerTitle'),
      description: t('composerDescription'),
      selectedPhotos: t('composerSelectedPhotos'),
      suggestedTitles: t('composerSuggestedTitles'),
      chapterTitle: t('composerChapterTitle'),
      backgroundNote: t('composerBackgroundNote'),
      cancel: t('composerCancel'),
      createChapter: t('composerCreateChapter'),
    },
    moveDialog: {
      title: t('moveDialogTitle'),
      description: t('moveDialogDescription'),
    },
    detailDrawer: {
      title: t('detailDrawerTitle'),
      description: t('detailDrawerDescription'),
      cancel: t('detailDrawerCancel'),
      save: t('detailDrawerSave'),
    },
  }
}

export function buildAlbumNarrativeSnapshot({
  description,
  chapters,
  ungroupedPhotos,
}: {
  title: string
  description: string | null
  chapters: Array<{ aiSummary?: string | null }>
  ungroupedPhotos: Array<{ id: string }>
}) {
  const summarizedChapterCount = chapters.filter(chapter => Boolean(chapter.aiSummary)).length
  const ungroupedCount = ungroupedPhotos.length
  const hasDescription = Boolean(description?.trim())
  const hasNarrativeFoundation = chapters.length > 0 && (summarizedChapterCount > 0 || hasDescription)

  return {
    chapterCount: chapters.length,
    summarizedChapterCount,
    ungroupedCount,
    hasDescription,
    hasNarrativeFoundation,
    shouldPromptDescription: !hasDescription,
    shouldPromptOrganization: chapters.length === 0 || ungroupedCount > 0,
  }
}

export function buildChapterSummaryActionState(args: {
  hasSummary: boolean
  isRefreshing: boolean
  copy: {
    refreshSummary: string
    generateSummary: string
    refreshingSummary: string
    generatingSummary: string
  }
}) {
  return buildSummaryActionState(args)
}

export function buildAlbumDetailSections({
  chapters,
  ungroupedPhotos,
}: {
  chapters: Array<{ id: string; title: string }>
  ungroupedPhotos: Array<{ id: string }>
}) {
  return {
    chapterCount: chapters.length,
    hasEmptyChapters: chapters.length === 0,
    ungroupedCount: ungroupedPhotos.length,
    order: ['chapters', 'ungrouped'] as const,
  }
}

export function buildAlbumSelectionState({
  selectionMode,
  selectedPhotoIds,
}: {
  selectionMode: boolean
  selectedPhotoIds: string[]
}) {
  if (!selectionMode) {
    return {
      active: false,
      count: 0,
      canCreateChapter: false,
      canMove: false,
      canUngroup: false,
    }
  }

  const count = selectedPhotoIds.length
  const hasSelection = count > 0

  return {
    active: true,
    count,
    canCreateChapter: hasSelection,
    canMove: hasSelection,
    canUngroup: hasSelection,
  }
}

export default function AlbumDetailPage() {
  const t = useTranslations('AlbumDetailPage')
  const params = useParams()
  const router = useRouter()
  const albumId = params.albumId as string

  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [album, setAlbum] = useState<AlbumDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [photoPreview, setPhotoPreview] = useState<{
    photoId: string
    chapterPhotoIds: string[]
  } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectionMode, setSelectionMode] = useState(false)
  const [albumSelectionMode, setAlbumSelectionMode] = useState(false)
  const [selectedUngroupedIds, setSelectedUngroupedIds] = useState<string[]>([])
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])
  const [chapterComposerOpen, setChapterComposerOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<AlbumChapterCardData | null>(null)
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [summaryActionChapterId, setSummaryActionChapterId] = useState<string | null>(null)
  const uiText = buildAlbumDetailUiText(t)

  useEffect(() => {
    async function fetchData() {
      const coupleRes = await fetch('/api/couples/mine')
      if (!coupleRes.ok) return
      const couple = await coupleRes.json()
      setCoupleId(couple.id)

      const albumRes = await fetch(`/api/couples/${couple.id}/albums/${albumId}`)
      if (albumRes.ok) {
        const data = await albumRes.json()
        setAlbum(data)
      }

      setLoading(false)
    }

    fetchData()
  }, [albumId, refreshKey])

  const allVisiblePhotos = useMemo(() => {
    if (!album) return []
    return [
      ...album.ungroupedPhotos,
      ...album.chapters.flatMap(chapter => chapter.photos),
    ]
  }, [album])

  const selectedPhoto = useMemo(() => {
    if (!photoPreview) return null
    return allVisiblePhotos.find(photo => photo.id === photoPreview.photoId) ?? null
  }, [allVisiblePhotos, photoPreview])

  useEffect(() => {
    if (!coupleId || !album) return
    const hasProcessing = allVisiblePhotos.some(photo => photo.status === 'PROCESSING')
    if (!hasProcessing) return

    const interval = setInterval(async () => {
      const res = await fetch(`/api/couples/${coupleId}/albums/${albumId}`)
      if (res.ok) {
        const data = await res.json()
        setAlbum(data)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [album, albumId, allVisiblePhotos, coupleId])

  useEffect(() => {
    if (!loading && !album) router.push('/albums')
  }, [loading, album, router])

  function toggleUngroupedSelection(photoId: string) {
    setSelectedUngroupedIds(prev =>
      prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    )
  }

  function toggleAlbumSelection(photoId: string) {
    setSelectedPhotoIds(prev =>
      prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    )
  }

  function openChapterPhotoPreview(photoId: string, chapterPhotoIds: string[]) {
    setPhotoPreview({
      photoId,
      chapterPhotoIds,
    })
  }

  async function handleSetCover(photoId: string) {
    if (!coupleId) return
    setActionError(null)

    const res = await fetch(`/api/couples/${coupleId}/albums/${albumId}/cover`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'MANUAL',
        photoId,
      }),
    })

    if (res.ok) {
      setRefreshKey(key => key + 1)
      return
    }

    const data = await res.json().catch(() => null)
    setActionError(data?.error?.message || t('setCoverFailed'))
  }

  async function openComposerForPhotoIds(photoIds: string[]) {
    if (!coupleId || photoIds.length === 0) return

    const res = await fetch(`/api/couples/${coupleId}/albums/${albumId}/chapters/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoIds,
      }),
    })

    const data = await res.json().catch(() => ({ suggestions: [] }))
    setTitleSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
    setChapterComposerOpen(true)
  }

  async function openComposerFromUngrouped() {
    await openComposerForPhotoIds(selectedUngroupedIds)
  }

  async function handleCreateChapter(payload: { title: string; backgroundNote: string }) {
    if (!coupleId) return

    setActionError(null)

    const res = await fetch(`/api/couples/${coupleId}/albums/${albumId}/chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        photoIds: selectedUngroupedIds,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setActionError(data?.error?.message || uiText.createChapterFailed)
      return
    }

    setSelectionMode(false)
    setSelectedUngroupedIds([])
    setChapterComposerOpen(false)
    setTitleSuggestions([])
    setRefreshKey(key => key + 1)
  }

  async function handleUngroupSelected() {
    if (!coupleId || selectedPhotoIds.length === 0) return

    const res = await fetch(`/api/couples/${coupleId}/albums/${albumId}/chapters/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'UNGROUP',
        photoIds: selectedPhotoIds,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setActionError(data?.error?.message || uiText.ungroupFailed)
      return
    }

    setAlbumSelectionMode(false)
    setSelectedPhotoIds([])
    setRefreshKey(key => key + 1)
  }

  async function handleMoveSelected(targetChapterId: string) {
    if (!coupleId || selectedPhotoIds.length === 0) return

    const res = await fetch(`/api/couples/${coupleId}/albums/${albumId}/chapters/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'MOVE',
        targetChapterId,
        photoIds: selectedPhotoIds,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setActionError(data?.error?.message || uiText.movePhotoFailed)
      return
    }

    setMoveDialogOpen(false)
    setAlbumSelectionMode(false)
    setSelectedPhotoIds([])
    setRefreshKey(key => key + 1)
  }

  async function handleSaveChapter(payload: { title: string; backgroundNote: string }) {
    if (!coupleId || !editingChapter) return

    const res = await fetch(`/api/couples/${coupleId}/albums/${albumId}/chapters/${editingChapter.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setActionError(data?.error?.message || uiText.saveChapterFailed)
      return
    }

    setEditingChapter(null)
    setRefreshKey(key => key + 1)
  }

  async function handleGenerateSummary(chapterId: string) {
    if (!coupleId) return

    setActionError(null)
    setActionMessage(null)
    setSummaryActionChapterId(chapterId)

    const res = await fetch(`/api/couples/${coupleId}/albums/${albumId}/chapters/${chapterId}/summary`, {
      method: 'POST',
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setActionError(data?.error?.message || uiText.generateSummaryFailed)
      setSummaryActionChapterId(null)
      return
    }

    setActionMessage(uiText.summaryUpdated)
    setSummaryActionChapterId(null)
    setRefreshKey(key => key + 1)
  }

  if (loading) return <PhotoGridSkeleton />
  if (!album) return null

  const sections = buildAlbumDetailSections({
    chapters: album.chapters,
    ungroupedPhotos: album.ungroupedPhotos,
  })
  const narrativeSnapshot = buildAlbumNarrativeSnapshot({
    title: album.title,
    description: album.description,
    chapters: album.chapters,
    ungroupedPhotos: album.ungroupedPhotos,
  })
  const albumSelectionState = buildAlbumSelectionState({
    selectionMode: albumSelectionMode,
    selectedPhotoIds,
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/albums"
          className="p-2 text-warm-muted hover:text-warm-text rounded-[var(--radius-sm)]
            hover:bg-warm-border/50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-warm-text">{album.title}</h1>
          {album.description && (
            <p className="text-sm text-warm-muted mt-0.5">{album.description}</p>
          )}
        </div>
      </div>

      <section className="rounded-[var(--radius-lg)] border border-warm-border bg-warm-surface p-5 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-warm-text">{uiText.narrative.title}</h2>
          <p className="text-sm text-warm-muted">{uiText.narrative.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-[var(--radius-md)] bg-warm-bg px-3 py-3">
            <div className="text-xs text-warm-muted">{uiText.narrative.chapterCount}</div>
            <div className="mt-1 text-lg font-semibold text-warm-text">{narrativeSnapshot.chapterCount}</div>
          </div>
          <div className="rounded-[var(--radius-md)] bg-warm-bg px-3 py-3">
            <div className="text-xs text-warm-muted">{uiText.narrative.summarizedCount}</div>
            <div className="mt-1 text-lg font-semibold text-warm-text">{narrativeSnapshot.summarizedChapterCount}</div>
          </div>
          <div className="rounded-[var(--radius-md)] bg-warm-bg px-3 py-3">
            <div className="text-xs text-warm-muted">{uiText.narrative.ungroupedCount}</div>
            <div className="mt-1 text-lg font-semibold text-warm-text">{narrativeSnapshot.ungroupedCount}</div>
          </div>
          <div className="rounded-[var(--radius-md)] bg-warm-bg px-3 py-3">
            <div className="text-xs text-warm-muted">{uiText.narrative.descriptionReady}</div>
            <div className="mt-1 text-sm font-medium text-warm-text">
              {narrativeSnapshot.hasDescription ? uiText.narrative.descriptionReady : uiText.narrative.descriptionMissing}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {narrativeSnapshot.hasNarrativeFoundation ? (
            <p className="text-success">{uiText.narrative.readyHint}</p>
          ) : null}
          {narrativeSnapshot.shouldPromptDescription ? (
            <p className="text-warm-muted">{uiText.narrative.needDescriptionHint}</p>
          ) : null}
          {narrativeSnapshot.shouldPromptOrganization ? (
            <p className="text-warm-muted">{uiText.narrative.needOrganizationHint}</p>
          ) : null}
        </div>
      </section>

      {actionError && (
        <div className="rounded-[var(--radius-md)] border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {actionError}
        </div>
      )}

      {actionMessage && (
        <div className="rounded-[var(--radius-md)] border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          {actionMessage}
        </div>
      )}

      {coupleId && (
        <div>
          <PhotoUploader
            coupleId={coupleId}
            albumId={albumId}
            onUploaded={() => setRefreshKey(key => key + 1)}
          />
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-warm-text">{uiText.chapterSectionTitle}</h2>
            <p className="text-sm text-warm-muted">{uiText.chapterSectionDescription}</p>
          </div>
          {sections.ungroupedCount > 0 ? (
            <button
              type="button"
              onClick={() => setAlbumSelectionMode(true)}
              className="px-3 py-2 rounded-[var(--radius-md)] border border-warm-border text-sm text-warm-text"
            >
              {uiText.organizeAllPhotos}
            </button>
          ) : null}
        </div>

        {sections.hasEmptyChapters ? (
          <AlbumEmptyChapters copy={uiText.chapterEmpty} onCreate={() => setSelectionMode(true)} />
        ) : (
          <div className="space-y-4">
            {album.chapters.map(chapter => (
              <div key={chapter.id} className="space-y-3">
                <AlbumChapterCard
                  chapter={chapter}
                  copy={{
                    photoCount: uiText.photoCount(chapter.photos.length),
                    editChapter: uiText.chapterCard.editChapter,
                    refreshSummary: uiText.chapterCard.refreshSummary,
                    generateSummary: uiText.chapterCard.generateSummary,
                    refreshingSummary: uiText.chapterCard.refreshingSummary,
                    generatingSummary: uiText.chapterCard.generatingSummary,
                  }}
                  onOpenPhoto={photo => openChapterPhotoPreview(photo.id, chapter.photos.map(item => item.id))}
                  onEditChapter={() => setEditingChapter(chapter)}
                  onRefreshSummary={() => handleGenerateSummary(chapter.id)}
                  isRefreshingSummary={summaryActionChapterId === chapter.id}
                />
                {albumSelectionMode ? (
                  <PhotoSelectionGrid
                    photos={chapter.photos}
                    selectedIds={selectedPhotoIds}
                    selectionMode={albumSelectionMode}
                    onToggle={toggleAlbumSelection}
                    onOpen={photo => openChapterPhotoPreview(photo.id, chapter.photos.map(item => item.id))}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-warm-text">{uiText.ungroupedSectionTitle}</h2>
            <p className="text-sm text-warm-muted">{uiText.ungroupedSectionDescription}</p>
          </div>
          {selectionMode ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-warm-muted">{uiText.selectionCount(selectedUngroupedIds.length)}</span>
              <button
                type="button"
                onClick={openComposerFromUngrouped}
                disabled={selectedUngroupedIds.length === 0}
                className="px-3 py-2 rounded-[var(--radius-md)] bg-warm-accent text-white text-sm disabled:opacity-50"
              >
                {uiText.createChapter}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectionMode(false)
                  setSelectedUngroupedIds([])
                }}
                className="px-3 py-2 rounded-[var(--radius-md)] border border-warm-border text-sm text-warm-text"
              >
                {uiText.cancel}
              </button>
            </div>
          ) : (
            <div className="text-sm text-warm-muted">
              {uiText.photoCount(sections.ungroupedCount)}
            </div>
          )}
        </div>

        {sections.ungroupedCount === 0 ? (
          <div className="text-center py-16 bg-warm-surface rounded-[var(--radius-lg)] border border-warm-border">
            <p className="text-warm-muted">{uiText.ungroupedEmpty}</p>
          </div>
        ) : (
          <PhotoSelectionGrid
            photos={album.ungroupedPhotos}
            selectedIds={albumSelectionMode ? selectedPhotoIds : selectedUngroupedIds}
            selectionMode={albumSelectionMode ? albumSelectionMode : selectionMode}
            onToggle={albumSelectionMode ? toggleAlbumSelection : toggleUngroupedSelection}
            onOpen={photo => setPhotoPreview({ photoId: photo.id, chapterPhotoIds: [photo.id] })}
          />
        )}
      </section>

      {albumSelectionState.active ? (
        <ChapterSelectionToolbar
          copy={{
            selectedCount: uiText.selectionCount(albumSelectionState.count),
            createChapter: uiText.selectionToolbar.createChapter,
            moveToChapter: uiText.selectionToolbar.moveToChapter,
            ungroupPhotos: uiText.selectionToolbar.ungroupPhotos,
            cancel: uiText.selectionToolbar.cancel,
          }}
          onCreate={async () => {
            setSelectionMode(false)
            setSelectedUngroupedIds(selectedPhotoIds)
            setAlbumSelectionMode(false)
            await openComposerForPhotoIds(selectedPhotoIds)
          }}
          onMove={() => setMoveDialogOpen(true)}
          onUngroup={handleUngroupSelected}
          onCancel={() => {
            setAlbumSelectionMode(false)
            setSelectedPhotoIds([])
          }}
        />
      ) : null}

      {selectedPhoto && (
        <PhotoDetailModal
          key={selectedPhoto.id}
          photo={selectedPhoto}
          coupleId={coupleId ?? ''}
          chapterPhotoIds={photoPreview?.chapterPhotoIds ?? [selectedPhoto.id]}
          onNavigate={photoId => {
            if (!photoPreview) return
            setPhotoPreview({
              photoId,
              chapterPhotoIds: photoPreview.chapterPhotoIds,
            })
          }}
          onClose={() => setPhotoPreview(null)}
          onUpdated={() => {
            setPhotoPreview(null)
            setRefreshKey(key => key + 1)
          }}
          onSetCover={handleSetCover}
        />
      )}

      <ChapterComposerDrawer
        key={selectedUngroupedIds.join(',') || 'empty'}
        open={chapterComposerOpen}
        selectedPhotos={album.ungroupedPhotos.filter(photo => selectedUngroupedIds.includes(photo.id))}
        suggestedTitles={titleSuggestions}
        copy={uiText.composer}
        onClose={() => setChapterComposerOpen(false)}
        onSubmit={handleCreateChapter}
      />

      <MoveToChapterDialog
        open={moveDialogOpen}
        chapters={album.chapters.map(chapter => ({ id: chapter.id, title: chapter.title }))}
        copy={uiText.moveDialog}
        onSelect={handleMoveSelected}
        onClose={() => setMoveDialogOpen(false)}
      />

      <ChapterDetailDrawer
        key={editingChapter?.id ?? 'closed'}
        chapter={editingChapter}
        open={Boolean(editingChapter)}
        copy={uiText.detailDrawer}
        onClose={() => setEditingChapter(null)}
        onSave={handleSaveChapter}
      />
    </div>
  )
}
