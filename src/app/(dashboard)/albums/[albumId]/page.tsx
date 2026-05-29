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
import { AlbumDetailWorkspace } from '@/components/album-detail-workspace'
import { AlbumEmptyChapters } from '@/components/album-empty-chapters'
import { ChapterComposerDrawer } from '@/components/chapter-composer-drawer'
import { ChapterSelectionToolbar } from '@/components/chapter-selection-toolbar'
import { MoveToChapterDialog } from '@/components/move-to-chapter-dialog'
import { PhotoSelectionGrid, buildAlbumPhotoPreviewItems } from '@/components/photo-selection-grid'
import { PhotoViewer, buildPhotoViewerCopy } from '@/components/photo-viewer'
import { type PhotoData } from '@/components/photo-card'
import { PhotoUploader } from '@/components/photo-uploader'
import { EditIcon, PlusIcon, RefreshIcon, TrashIcon } from '@/components/ui/button'
import { PhotoGridSkeleton } from '@/components/skeleton/photo-grid-skeleton'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer'

type Photo = PhotoData

interface AlbumDetailResponse {
  id: string
  title: string
  description: string | null
  chapters: AlbumChapterCardData[]
  ungroupedPhotos: Photo[]
}

export type AlbumDetailSurfaceState =
  | {
      kind: 'photo'
      photoId: string
      chapterPhotoIds: string[]
    }
  | {
      kind: 'chapter'
      chapterId: string
    }
  | null

type Translator = (key: string, values?: Record<string, string | number>) => string

export const ALBUM_NARRATIVE_LAYOUT_CLASS =
  'cm-album-narrative dashboard-surface-card-strong overflow-hidden rounded-[26px] p-3.5'

export const ALBUM_NARRATIVE_HERO_CARD_CLASS =
  'cm-album-narrative__hero-card dashboard-surface-card rounded-[24px] px-4 py-3'

export const ALBUM_NARRATIVE_HIGHLIGHT_CARD_CLASS =
  'cm-album-narrative__preview-card cm-album-narrative__preview-card--spotlight dashboard-surface-card-strong rounded-[24px] px-4 py-3'

export const ALBUM_NARRATIVE_PREVIEW_STATE_CLASS =
  'cm-album-narrative__preview-state cm-album-narrative__preview-card dashboard-surface-card rounded-[24px] px-4 py-3'

export const ALBUM_NARRATIVE_EDITOR_CLASS =
  'cm-album-narrative__editor dashboard-inset-panel rounded-[24px] px-4 py-3'

export const ALBUM_NARRATIVE_STAT_GRID_CLASS =
  'cm-album-narrative__stats grid grid-cols-2 gap-3 sm:grid-cols-4'

export const ALBUM_NARRATIVE_STAT_CARD_CLASS =
  'cm-album-narrative__stat-card dashboard-surface-card-soft rounded-[22px] px-3 py-2.5'

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
    photoActions: {
      previewPhoto: t('photoActionPreviewPhoto'),
      editPhoto: t('photoActionEditPhoto'),
      deletePhoto: t('photoActionDeletePhoto'),
      deletingPhoto: t('photoActionDeletingPhoto'),
      deleteConfirm: t('photoActionDeleteConfirm'),
      setAsCover: t('photoActionSetAsCover'),
      settingCover: t('photoActionSettingCover'),
      currentCover: t('photoActionCurrentCover'),
      setCoverConfirm: t('photoActionSetCoverConfirm'),
    },
    narrative: {
      title: t('narrativeTitle'),
      description: t('narrativeDescription'),
      chapterCount: t('narrativeChapterCount'),
      summarizedCount: t('narrativeSummarizedCount'),
      ungroupedCount: t('narrativeUngroupedCount'),
      descriptionReady: t('narrativeDescriptionReady'),
      descriptionMissing: t('narrativeDescriptionMissing'),
      editAlbum: t('narrativeEditAlbum'),
      saveAlbum: t('narrativeSaveAlbum'),
      savingAlbum: t('narrativeSavingAlbum'),
      generateTitleDraft: t('narrativeGenerateTitleDraft'),
      generateDescriptionDraft: t('narrativeGenerateDescriptionDraft'),
      regenerateTitleDraft: t('narrativeRegenerateTitleDraft'),
      regenerateDescriptionDraft: t('narrativeRegenerateDescriptionDraft'),
      applyTitleDraft: t('narrativeApplyTitleDraft'),
      applyDescriptionDraft: t('narrativeApplyDescriptionDraft'),
      coverCandidates: t('narrativeCoverCandidates'),
      coverCandidatesEmpty: t('coverRecentPhotosEmpty'),
      setAsCover: t('narrativeSetAsCover'),
      currentCover: t('narrativeCurrentCover'),
      aiTitleLabel: t('narrativeAiTitleLabel'),
      currentTitleLabel: t('narrativeCurrentTitleLabel'),
      aiDescriptionLabel: t('narrativeAiDescriptionLabel'),
      currentDescriptionLabel: t('narrativeCurrentDescriptionLabel'),
      titleLabel: t('narrativeTitleLabel'),
      descriptionLabel: t('narrativeDescriptionLabel'),
      readyHint: t('narrativeReadyHint'),
      needDescriptionHint: t('narrativeNeedDescriptionHint'),
      needOrganizationHint: t('narrativeNeedOrganizationHint'),
      saveFailed: t('narrativeSaveFailed'),
      saveSuccess: t('narrativeSaveSuccess'),
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
    workspace: {
      emptyTitle: t('workspaceEmptyTitle'),
      emptyDescription: t('workspaceEmptyDescription'),
      close: t('workspaceClose'),
      photoTitle: t('workspacePhotoTitle'),
      photoDescription: t('workspacePhotoDescription'),
      chapterTitle: t('workspaceChapterTitle'),
      chapterDescription: t('workspaceChapterDescription'),
    },
    detailDrawer: {
      title: t('detailDrawerTitle'),
      description: t('detailDrawerDescription'),
      cancel: t('detailDrawerCancel'),
      save: t('detailDrawerSave'),
    },
  }
}

export function buildAlbumCoverCandidates(photos: PhotoData[]) {
  return photos
    .filter(photo => photo.status === 'READY' && Boolean(photo.displayUrl) && photo.canBeCover)
    .sort((a, b) => Number(Boolean(b.isAlbumCover)) - Number(Boolean(a.isAlbumCover)))
    .slice(0, 4)
    .map(photo => ({
      id: photo.id,
      previewUrl: photo.thumbnailUrl || photo.displayUrl || '',
      label: photo.userCaption || photo.aiCaption || photo.fileName,
      isCurrent: Boolean(photo.isAlbumCover),
    }))
}

export function buildAlbumCoverSectionState(photos: PhotoData[]) {
  const candidates = buildAlbumCoverCandidates(photos)

  return {
    candidates,
    hasCandidates: candidates.length > 0,
    shouldShowEmptyState: candidates.length === 0,
  }
}

export function buildAlbumNarrativeSnapshot({
  description,
  chapters,
  ungroupedPhotos,
}: {
  title: string
  description: string | null
  chapters: Array<{
    id?: string
    title?: string
    backgroundNote?: string | null
    aiSummary?: string | null
    photos?: Array<{ id: string }>
  }>
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

export function buildAlbumMetaDraft(album: {
  title: string
  description: string | null
}) {
  return {
    title: album.title,
    description: album.description ?? '',
  }
}

export function buildAlbumMetaUpdatePayload(input: {
  title: string
  description: string
}) {
  return {
    title: input.title.trim(),
    description: input.description.trim() || null,
  }
}

export function buildAlbumNarrativeComparison({
  album,
}: {
  album: {
    title: string
    description: string | null
    chapters: Array<{
      title?: string
      aiSummary?: string | null
    }>
  }
}) {
  const aiTitle = buildAlbumTitleDraftSuggestion({
    title: album.title,
    chapters: album.chapters,
  })
  const aiDescription = buildAlbumDescriptionDraftSuggestion({
    title: album.title,
    chapters: album.chapters,
  })
  const currentTitle = album.title
  const currentDescription = album.description ?? ''

  return {
    aiTitle,
    currentTitle,
    aiDescription,
    currentDescription,
    hasAiTitle: Boolean(aiTitle),
    hasAiDescription: Boolean(aiDescription),
    titleDiffers: Boolean(aiTitle) && aiTitle !== currentTitle,
    descriptionDiffers: Boolean(aiDescription) && aiDescription !== currentDescription,
  }
}

export function buildAlbumNarrativePreview({
  comparison,
  copy,
}: {
  comparison: {
    aiTitle: string
    currentTitle: string
    aiDescription: string
    currentDescription: string
    hasAiTitle: boolean
    hasAiDescription: boolean
    titleDiffers: boolean
    descriptionDiffers: boolean
  }
  copy: {
    currentTitleLabel: string
    aiDescriptionLabel: string
    currentDescriptionLabel: string
    needDescriptionHint: string
    descriptionMissing: string
  }
}) {
  return {
    titleLabel: copy.currentTitleLabel,
    titleValue: comparison.currentTitle,
    draftDescriptionLabel: copy.aiDescriptionLabel,
    draftDescriptionValue: comparison.aiDescription || copy.needDescriptionHint,
    currentDescriptionLabel: copy.currentDescriptionLabel,
    currentDescriptionValue: comparison.currentDescription || copy.descriptionMissing,
    hasDraftDescription: comparison.hasAiDescription,
  }
}

export function buildAlbumDescriptionDraftSuggestion({
  chapters,
}: {
  title: string
  chapters: Array<{
    title?: string
    aiSummary?: string | null
  }>
}) {
  const titledChapters = chapters
    .map(chapter => chapter.title?.trim())
    .filter((title): title is string => Boolean(title))
  const summarySnippets = chapters
    .map(chapter => chapter.aiSummary?.trim())
    .filter((summary): summary is string => Boolean(summary))

  if (titledChapters.length === 0) {
    return ''
  }

  const chapterLabel = titledChapters.length === 1
    ? `“${titledChapters[0]}”这一段回忆`
    : `“${titledChapters.slice(0, 2).join('”和“')}”这些回忆`

  if (summarySnippets.length === 0) {
    return `这本相册记录了${chapterLabel}。`
  }

  return `这本相册收着${chapterLabel}。${summarySnippets.slice(0, 2).join('')}`
}

export function buildNextAlbumDescriptionDraftSuggestion({
  chapters,
  previousSuggestion,
}: {
  title: string
  chapters: Array<{
    title?: string
    aiSummary?: string | null
  }>
  previousSuggestion?: string | null
}) {
  const titledChapters = chapters
    .map(chapter => chapter.title?.trim())
    .filter((title): title is string => Boolean(title))
  const summarySnippets = chapters
    .map(chapter => chapter.aiSummary?.trim())
    .filter((summary): summary is string => Boolean(summary))

  if (titledChapters.length === 0) {
    return ''
  }

  const primaryChapterLabel = titledChapters.length === 1
    ? `“${titledChapters[0]}”这一段回忆`
    : `“${titledChapters.slice(0, 2).join('”和“')}”这些回忆`
  const compactChapterLabel = titledChapters.length === 1
    ? titledChapters[0]!
    : titledChapters.slice(0, 2).join('、')
  const compactSummaries = summarySnippets.slice(0, 2).join('')

  const candidates = [
    buildAlbumDescriptionDraftSuggestion({ title: '', chapters }),
    summarySnippets.length > 0
      ? `这本相册围绕${primaryChapterLabel}展开。${compactSummaries}`
      : `这本相册围绕${primaryChapterLabel}展开。`,
    summarySnippets.length > 0
      ? `相册里收着${compactChapterLabel}的片段。${compactSummaries}`
      : `相册里收着${compactChapterLabel}的片段。`,
  ]
    .map(candidate => candidate.trim())
    .filter((candidate, index, list) => candidate.length > 0 && list.indexOf(candidate) === index)

  if (!previousSuggestion) {
    return candidates[0] ?? ''
  }

  return candidates.find(candidate => candidate !== previousSuggestion) ?? candidates[0] ?? ''
}

export function buildAlbumTitleDraftSuggestion({
  chapters,
}: {
  title: string
  chapters: Array<{
    title?: string
  }>
}) {
  const titledChapters = chapters
    .map(chapter => chapter.title?.trim())
    .filter((title): title is string => Boolean(title))

  if (titledChapters.length === 0) {
    return ''
  }

  const normalizeTitle = (title: string, compact = false) =>
    title
      .replace(/的时刻$/u, '')
      .replace(/这一段回忆$/u, '')
      .replace(/的晚风$/u, '')
      .replace(compact ? /婚纱照$/u : /^$/u, '')
      .trim()

  if (titledChapters.length === 1) {
    return normalizeTitle(titledChapters[0]!)
  }

  return `${normalizeTitle(titledChapters[0]!, true)}与${normalizeTitle(titledChapters[1]!, true)}`
}

export function buildNextAlbumTitleDraftSuggestion({
  chapters,
  previousSuggestion,
}: {
  title: string
  chapters: Array<{
    title?: string
  }>
  previousSuggestion?: string | null
}) {
  const titledChapters = chapters
    .map(chapter => chapter.title?.trim())
    .filter((title): title is string => Boolean(title))

  if (titledChapters.length === 0) {
    return ''
  }

  const normalizeTitle = (title: string, compact = false) =>
    title
      .replace(/的时刻$/u, '')
      .replace(/这一段回忆$/u, '')
      .replace(/的晚风$/u, '')
      .replace(compact ? /婚纱照$/u : /^$/u, '')
      .trim()

  const firstTitle = normalizeTitle(titledChapters[0]!, true)
  const secondTitle = titledChapters[1] ? normalizeTitle(titledChapters[1], true) : ''
  const candidates = [
    buildAlbumTitleDraftSuggestion({ title: '', chapters }),
    secondTitle ? `${firstTitle}和${secondTitle}` : `${firstTitle}回忆`,
    secondTitle ? `${firstTitle} · ${secondTitle}` : `${firstTitle}记录`,
  ]
    .map(candidate => candidate.trim())
    .filter((candidate, index, list) => candidate.length > 0 && list.indexOf(candidate) === index)

  if (!previousSuggestion) {
    return candidates[0] ?? ''
  }

  return candidates.find(candidate => candidate !== previousSuggestion) ?? candidates[0] ?? ''
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
    chapterGridMode: 'card-only' as const,
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

export function buildAlbumDetailWorkspaceState({
  detailSurface,
  album,
}: {
  detailSurface: AlbumDetailSurfaceState
  album: AlbumDetailResponse | null
}) {
  if (!detailSurface || !album) {
    return {
      isOpen: false,
      kind: null,
      activePhoto: null,
      activeChapter: null,
    }
  }

  if (detailSurface.kind === 'photo') {
    const photos = [
      ...album.ungroupedPhotos,
      ...album.chapters.flatMap(chapter => chapter.photos),
    ]
    const activePhoto = photos.find(photo => photo.id === detailSurface.photoId) ?? null

    if (!activePhoto) {
      return {
        isOpen: false,
        kind: null,
        activePhoto: null,
        activeChapter: null,
      }
    }

    return {
      isOpen: true,
      kind: 'photo' as const,
      activePhoto,
      activeChapter: null,
    }
  }

  const activeChapter = album.chapters.find(chapter => chapter.id === detailSurface.chapterId) ?? null

  if (!activeChapter) {
    return {
      isOpen: false,
      kind: null,
      activePhoto: null,
      activeChapter: null,
    }
  }

  return {
    isOpen: true,
    kind: 'chapter' as const,
    activePhoto: null,
    activeChapter,
  }
}

export default function AlbumDetailPage() {
  const t = useTranslations('AlbumDetailPage')
  const viewerT = useTranslations('PhotoViewer')
  const params = useParams()
  const router = useRouter()
  const albumId = params.albumId as string

  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [album, setAlbum] = useState<AlbumDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailSurface, setDetailSurface] = useState<AlbumDetailSurfaceState>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectionMode, setSelectionMode] = useState(false)
  const [albumSelectionMode, setAlbumSelectionMode] = useState(false)
  const [selectedUngroupedIds, setSelectedUngroupedIds] = useState<string[]>([])
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])
  const [chapterComposerOpen, setChapterComposerOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [summaryActionChapterId, setSummaryActionChapterId] = useState<string | null>(null)
  const [editingAlbumMeta, setEditingAlbumMeta] = useState(false)
  const [albumMetaDraft, setAlbumMetaDraft] = useState({ title: '', description: '' })
  const [albumMetaSuggestions, setAlbumMetaSuggestions] = useState({ title: '', description: '' })
  const [savingAlbumMeta, setSavingAlbumMeta] = useState(false)
  const [previewState, setPreviewState] = useState<{ photoId: string; indexHint: number } | null>(null)
  const [pendingDeletePhotoId, setPendingDeletePhotoId] = useState<string | null>(null)
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)
  const [pendingCoverPhotoId, setPendingCoverPhotoId] = useState<string | null>(null)
  const [settingCoverPhotoId, setSettingCoverPhotoId] = useState<string | null>(null)
  const uiText = buildAlbumDetailUiText(t)
  const viewerCopy = useMemo(() => buildPhotoViewerCopy(viewerT), [viewerT])

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
        setAlbumMetaDraft(buildAlbumMetaDraft(data))
        setAlbumMetaSuggestions({ title: '', description: '' })
      }

      setLoading(false)
    }

    fetchData()
  }, [albumId, refreshKey])

  const allVisiblePhotos = useMemo(() => {
    if (!album) return []
    return [
      ...album.chapters.flatMap(chapter => chapter.photos),
      ...album.ungroupedPhotos,
    ]
  }, [album])

  const previewItems = useMemo(() => buildAlbumPhotoPreviewItems(allVisiblePhotos), [allVisiblePhotos])
  const previewIndex = previewState
    ? previewItems.findIndex(item => item.id === previewState.photoId)
    : -1
  const activePreviewIndex = previewState
    ? (previewIndex >= 0 ? previewIndex : Math.min(previewState.indexHint, Math.max(previewItems.length - 1, 0)))
    : 0

  const workspaceState = useMemo(() => buildAlbumDetailWorkspaceState({
    detailSurface,
    album,
  }), [detailSurface, album])

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

  useEffect(() => {
    if (!detailSurface) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setDetailSurface(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [detailSurface])

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

  function openPhotoWorkspace(photoId: string) {
    if (!album) return

    const chapter = album.chapters.find(item => item.photos.some(photo => photo.id === photoId))

    setDetailSurface({
      kind: 'photo',
      photoId,
      chapterPhotoIds: chapter ? chapter.photos.map(photo => photo.id) : [photoId],
    })
  }

  function openAlbumPreview(photoId: string) {
    const nextIndex = previewItems.findIndex(item => item.id === photoId)
    if (nextIndex < 0) return

    setPreviewState({
      photoId,
      indexHint: nextIndex,
    })
  }

  function requestSetCover(photoId: string) {
    setPendingCoverPhotoId(photoId)
  }

  async function applySetCover(photoId: string) {
    if (!coupleId) return
    setActionError(null)
    setSettingCoverPhotoId(photoId)

    const res = await fetch(`/api/couples/${coupleId}/albums/${albumId}/cover`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'MANUAL',
        photoId,
      }),
    })

    setSettingCoverPhotoId(null)

    if (res.ok) {
      setRefreshKey(key => key + 1)
      return
    }

    const data = await res.json().catch(() => null)
    setActionError(data?.error?.message || t('setCoverFailed'))
  }

  async function handleSetCover() {
    if (!pendingCoverPhotoId) return
    await applySetCover(pendingCoverPhotoId)
    setPendingCoverPhotoId(null)
  }

  function requestDeletePhoto(photoId: string) {
    setPendingDeletePhotoId(photoId)
  }

  async function handleDeletePhoto() {
    if (!pendingDeletePhotoId) return
    if (!coupleId) return

    setActionError(null)
    setActionMessage(null)
    setDeletingPhotoId(pendingDeletePhotoId)

    const res = await fetch(`/api/couples/${coupleId}/photos/${pendingDeletePhotoId}`, {
      method: 'DELETE',
    })

    setDeletingPhotoId(null)

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setActionError(data?.error?.message || t('deleteFailed'))
      return
    }

    setSelectedPhotoIds(prev => prev.filter(id => id !== pendingDeletePhotoId))
    setSelectedUngroupedIds(prev => prev.filter(id => id !== pendingDeletePhotoId))
    setDetailSurface(prev => prev?.kind === 'photo' && prev.photoId === pendingDeletePhotoId ? null : prev)
    setPendingDeletePhotoId(null)
    setRefreshKey(key => key + 1)
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

  async function handleSaveChapter(chapterId: string, payload: { title: string; backgroundNote: string }) {
    if (!coupleId) return

    const res = await fetch(`/api/couples/${coupleId}/albums/${albumId}/chapters/${chapterId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setActionError(data?.error?.message || uiText.saveChapterFailed)
      return
    }

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

  async function handleSaveAlbumMeta() {
    if (!coupleId || !album) return

    setActionError(null)
    setActionMessage(null)
    setSavingAlbumMeta(true)

    const payload = buildAlbumMetaUpdatePayload(albumMetaDraft)
    const res = await fetch(`/api/couples/${coupleId}/albums/${albumId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSavingAlbumMeta(false)

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setActionError(data?.error?.message || uiText.narrative.saveFailed)
      return
    }

    const updated = await res.json()
    setAlbum(prev => prev ? {
      ...prev,
      title: typeof updated.title === 'string' ? updated.title : prev.title,
      description: typeof updated.description === 'string' || updated.description === null
        ? updated.description
        : prev.description,
    } : prev)
    setAlbumMetaDraft(buildAlbumMetaDraft({
      title: typeof updated.title === 'string' ? updated.title : album.title,
      description: typeof updated.description === 'string' || updated.description === null
        ? updated.description
        : album.description,
    }))
    setAlbumMetaSuggestions({ title: '', description: '' })
    setEditingAlbumMeta(false)
    setActionMessage(uiText.narrative.saveSuccess)
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
  const narrativeComparison = buildAlbumNarrativeComparison({ album })
  const narrativePreview = buildAlbumNarrativePreview({
    comparison: narrativeComparison,
    copy: {
      currentTitleLabel: uiText.narrative.currentTitleLabel,
      aiDescriptionLabel: uiText.narrative.aiDescriptionLabel,
      currentDescriptionLabel: uiText.narrative.currentDescriptionLabel,
      needDescriptionHint: uiText.narrative.needDescriptionHint,
      descriptionMissing: uiText.narrative.descriptionMissing,
    },
  })
  const albumSelectionState = buildAlbumSelectionState({
    selectionMode: albumSelectionMode,
    selectedPhotoIds,
  })
  return (
    <>
    <div className="min-w-0 space-y-8">
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
          <h1 className="dashboard-page-title text-warm-text">{album.title}</h1>
          {album.description && (
            <p className="text-sm text-warm-muted mt-0.5">{album.description}</p>
          )}
        </div>
      </div>

      <section className={ALBUM_NARRATIVE_LAYOUT_CLASS}>
        <div className={ALBUM_NARRATIVE_HERO_CARD_CLASS}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="cm-album-narrative__title">{uiText.narrative.title}</h2>
              <p className="cm-album-narrative__lede">{uiText.narrative.description}</p>
            </div>
            <Button
              type="button"
              onClick={() => {
                setAlbumMetaDraft(buildAlbumMetaDraft(album))
                setAlbumMetaSuggestions({ title: '', description: '' })
                setEditingAlbumMeta(prev => !prev)
              }}
              variant="secondary"
              size="sm"
              leadingIcon={<EditIcon />}
            >
              {uiText.narrative.editAlbum}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
          <div className={ALBUM_NARRATIVE_HIGHLIGHT_CARD_CLASS}>
            <div className="cm-album-narrative__preview-head">
              <p className="cm-album-narrative__label">
                {narrativePreview.titleLabel}
              </p>
              <p className="cm-album-narrative__value">
                {narrativePreview.titleValue}
              </p>
            </div>
            <div className="cm-album-narrative__divider" />
            <div className="space-y-1.5">
              <p className="cm-album-narrative__label">
                {narrativePreview.currentDescriptionLabel}
              </p>
              <p className="cm-album-narrative__body">
                {narrativePreview.currentDescriptionValue}
              </p>
            </div>
          </div>

          <div className={ALBUM_NARRATIVE_PREVIEW_STATE_CLASS}>
            <div className="space-y-1.5">
              <p className="cm-album-narrative__label">
                {narrativePreview.draftDescriptionLabel}
              </p>
              <p className="cm-album-narrative__body">
                {narrativePreview.draftDescriptionValue}
              </p>
            </div>
            <div className="space-y-2">
              {narrativeSnapshot.hasNarrativeFoundation ? (
                <p className="cm-album-narrative__note cm-album-narrative__note--positive">{uiText.narrative.readyHint}</p>
              ) : null}
              {narrativeSnapshot.shouldPromptDescription ? (
                <p className="cm-album-narrative__note">{uiText.narrative.needDescriptionHint}</p>
              ) : null}
              {narrativeSnapshot.shouldPromptOrganization ? (
                <p className="cm-album-narrative__note">{uiText.narrative.needOrganizationHint}</p>
              ) : null}
            </div>
          </div>
        </div>

        {editingAlbumMeta ? (
          <div className={ALBUM_NARRATIVE_EDITOR_CLASS}>
            <p className="cm-album-narrative__label">{uiText.narrative.editAlbum}</p>
            <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-warm-text">{uiText.narrative.titleLabel}</span>
              <input
                value={albumMetaDraft.title}
                onChange={e => setAlbumMetaDraft(prev => ({ ...prev, title: e.target.value }))}
                className="dashboard-input px-4 py-2.5 text-sm text-warm-text"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-warm-text">{uiText.narrative.descriptionLabel}</span>
              <textarea
                value={albumMetaDraft.description}
                onChange={e => setAlbumMetaDraft(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="dashboard-input min-h-[132px] resize-none px-4 py-3 text-sm leading-6 text-warm-text"
              />
            </label>
            </div>
            <div className="cm-album-narrative__editor-actions">
              <div className="cm-album-narrative__editor-actions-secondary">
                <Button
                  type="button"
                  onClick={() => {
                    const suggestion = buildNextAlbumTitleDraftSuggestion({
                      title: album.title,
                      chapters: album.chapters,
                      previousSuggestion: albumMetaSuggestions.title || null,
                    })
                    if (!suggestion) return
                    setAlbumMetaSuggestions(prev => ({ ...prev, title: suggestion }))
                  }}
                  disabled={album.chapters.length === 0}
                  size="sm"
                  variant="subtle"
                >
                  {albumMetaSuggestions.title
                    ? uiText.narrative.regenerateTitleDraft
                    : uiText.narrative.generateTitleDraft}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const suggestion = buildNextAlbumDescriptionDraftSuggestion({
                      title: album.title,
                      chapters: album.chapters,
                      previousSuggestion: albumMetaSuggestions.description || null,
                    })
                    if (!suggestion) return
                    setAlbumMetaSuggestions(prev => ({ ...prev, description: suggestion }))
                  }}
                  disabled={album.chapters.length === 0}
                  size="sm"
                  variant="subtle"
                >
                  {albumMetaSuggestions.description
                    ? uiText.narrative.regenerateDescriptionDraft
                    : uiText.narrative.generateDescriptionDraft}
                </Button>
              </div>
              <div className="cm-album-narrative__editor-actions-primary">
              <Button
                type="button"
                onClick={() => {
                  setAlbumMetaDraft(buildAlbumMetaDraft(album))
                  setAlbumMetaSuggestions({ title: '', description: '' })
                  setEditingAlbumMeta(false)
                }}
                size="sm"
                variant="secondary"
              >
                {uiText.cancel}
              </Button>
              <Button
                type="button"
                onClick={handleSaveAlbumMeta}
                disabled={savingAlbumMeta || !albumMetaDraft.title.trim()}
                loading={savingAlbumMeta}
                size="sm"
                variant="brand"
                leadingIcon={<RefreshIcon />}
              >
                {savingAlbumMeta ? uiText.narrative.savingAlbum : uiText.narrative.saveAlbum}
              </Button>
              </div>
            </div>
            {albumMetaSuggestions.title ? (
              <div className="mt-4 rounded-[20px] border border-[var(--dashboard-card-hairline)] bg-[var(--dashboard-card-bg-soft)] px-4 py-3">
                <div className="cm-album-narrative__candidate-head">
                  <p className="cm-album-narrative__label">{uiText.narrative.aiTitleLabel}</p>
                  <p className="cm-album-narrative__candidate-title">{albumMetaSuggestions.title}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setAlbumMetaDraft(prev => ({ ...prev, title: albumMetaSuggestions.title }))}
                  >
                    {uiText.narrative.applyTitleDraft}
                  </Button>
                </div>
              </div>
            ) : null}
            {albumMetaSuggestions.description ? (
              <div className="mt-3 rounded-[20px] border border-[var(--dashboard-card-hairline)] bg-[var(--dashboard-card-bg-soft)] px-4 py-3">
                <div className="cm-album-narrative__candidate-head">
                  <p className="cm-album-narrative__label">{uiText.narrative.aiDescriptionLabel}</p>
                  <p className="cm-album-narrative__body">{albumMetaSuggestions.description}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setAlbumMetaDraft(prev => ({ ...prev, description: albumMetaSuggestions.description }))}
                  >
                    {uiText.narrative.applyDescriptionDraft}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="cm-album-narrative__stats grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className={ALBUM_NARRATIVE_STAT_CARD_CLASS}>
            <div className="cm-album-narrative__stat-label">{uiText.narrative.chapterCount}</div>
            <div className="cm-album-narrative__stat-value">{narrativeSnapshot.chapterCount}</div>
          </div>
          <div className={ALBUM_NARRATIVE_STAT_CARD_CLASS}>
            <div className="cm-album-narrative__stat-label">{uiText.narrative.summarizedCount}</div>
            <div className="cm-album-narrative__stat-value">{narrativeSnapshot.summarizedChapterCount}</div>
          </div>
          <div className={ALBUM_NARRATIVE_STAT_CARD_CLASS}>
            <div className="cm-album-narrative__stat-label">{uiText.narrative.ungroupedCount}</div>
            <div className="cm-album-narrative__stat-value">{narrativeSnapshot.ungroupedCount}</div>
          </div>
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
            <Button
              type="button"
              onClick={() => setAlbumSelectionMode(true)}
              size="sm"
              variant="secondary"
              leadingIcon={<PlusIcon />}
            >
              {uiText.organizeAllPhotos}
            </Button>
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
                  onOpenPhoto={photo => openPhotoWorkspace(photo.id)}
                  onTogglePhotoSelection={toggleAlbumSelection}
                  onPreviewPhoto={openAlbumPreview}
                  onDeletePhoto={requestDeletePhoto}
                  onRequestSetCover={requestSetCover}
                  onEditChapter={() => setDetailSurface({ kind: 'chapter', chapterId: chapter.id })}
                  onRefreshSummary={() => handleGenerateSummary(chapter.id)}
                  isRefreshingSummary={summaryActionChapterId === chapter.id}
                  selectionMode={albumSelectionMode}
                  selectedPhotoIds={selectedPhotoIds}
                  photoActionCopy={uiText.photoActions}
                  deletingPhotoId={deletingPhotoId}
                  settingCoverPhotoId={settingCoverPhotoId}
                />
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
              <Button
                type="button"
                onClick={openComposerFromUngrouped}
                disabled={selectedUngroupedIds.length === 0}
                size="sm"
                variant="brand"
                leadingIcon={<PlusIcon />}
              >
                {uiText.createChapter}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setSelectionMode(false)
                  setSelectedUngroupedIds([])
                }}
                size="sm"
                variant="secondary"
              >
                {uiText.cancel}
              </Button>
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
            onOpen={photo => openPhotoWorkspace(photo.id)}
            onPreviewPhoto={selectionMode || albumSelectionMode ? undefined : openAlbumPreview}
            onDeletePhoto={selectionMode || albumSelectionMode ? undefined : requestDeletePhoto}
            onRequestSetCover={selectionMode || albumSelectionMode ? undefined : requestSetCover}
            photoActionCopy={uiText.photoActions}
            deletingPhotoId={deletingPhotoId}
            settingCoverPhotoId={settingCoverPhotoId}
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

      <Modal
        open={pendingDeletePhotoId !== null}
        onClose={() => {
          if (deletingPhotoId) return
          setPendingDeletePhotoId(null)
        }}
        title={uiText.photoActions.deletePhoto}
        description={uiText.photoActions.deleteConfirm}
        confirmText={uiText.photoActions.deletePhoto}
        cancelText={uiText.cancel}
        confirmVariant="danger"
        confirmLoading={deletingPhotoId === pendingDeletePhotoId}
        onConfirm={handleDeletePhoto}
      >
        <p className="text-sm text-warm-muted">
          {[...album.chapters.flatMap(chapter => chapter.photos), ...album.ungroupedPhotos].find(photo => photo.id === pendingDeletePhotoId)?.fileName ?? ''}
        </p>
      </Modal>

      <Modal
        open={pendingCoverPhotoId !== null}
        onClose={() => {
          if (settingCoverPhotoId) return
          setPendingCoverPhotoId(null)
        }}
        title={uiText.photoActions.setAsCover}
        description={uiText.photoActions.setCoverConfirm}
        confirmText={uiText.photoActions.setAsCover}
        cancelText={uiText.cancel}
        confirmVariant="brand"
        confirmLoading={settingCoverPhotoId === pendingCoverPhotoId}
        onConfirm={handleSetCover}
      >
        <p className="text-sm text-warm-muted">
          {[...album.chapters.flatMap(chapter => chapter.photos), ...album.ungroupedPhotos].find(photo => photo.id === pendingCoverPhotoId)?.fileName ?? ''}
        </p>
      </Modal>

      <PhotoViewer
        open={previewState !== null && previewItems.length > 0}
        items={previewItems}
        currentIndex={activePreviewIndex}
        onIndexChange={index => {
          const nextItem = previewItems[index]
          if (!nextItem) return
          setPreviewState({
            photoId: nextItem.id,
            indexHint: index,
          })
        }}
        onClose={() => setPreviewState(null)}
        copy={viewerCopy}
        customActions={previewState ? [
          {
            key: 'delete',
            label: uiText.photoActions.deletePhoto,
            icon: <TrashIcon />,
            disabled: deletingPhotoId === previewItems[activePreviewIndex]?.id,
            onSelect: item => requestDeletePhoto(item.id),
          },
          {
            key: 'edit',
            label: uiText.photoActions.editPhoto,
            icon: <EditIcon />,
            onSelect: item => {
              setPreviewState(null)
              openPhotoWorkspace(item.id)
            },
          },
        ] : []}
      />
    </div>

    {workspaceState.isOpen ? (
      <ResponsiveDrawer
        open={workspaceState.isOpen}
        onClose={() => setDetailSurface(null)}
        ariaLabel={workspaceState.kind === 'photo' ? uiText.workspace.photoTitle : uiText.workspace.chapterTitle}
      >
          <AlbumDetailWorkspace
            state={workspaceState}
            chapterPhotoIds={detailSurface?.kind === 'photo' ? detailSurface.chapterPhotoIds : []}
            copy={uiText.workspace}
            coupleId={coupleId ?? ''}
            onClose={() => setDetailSurface(null)}
            onOpenPreview={openAlbumPreview}
            onPhotoNavigate={photoId => {
              if (detailSurface?.kind !== 'photo') return
              setDetailSurface({
                kind: 'photo',
                photoId,
                chapterPhotoIds: detailSurface.chapterPhotoIds,
              })
            }}
            onRefreshData={() => setRefreshKey(key => key + 1)}
            onSetCover={applySetCover}
            onSaveChapter={handleSaveChapter}
          />
      </ResponsiveDrawer>
    ) : null}
    </>
  )
}
