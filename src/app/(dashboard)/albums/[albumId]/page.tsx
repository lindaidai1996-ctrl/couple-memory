'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { PhotoUploader } from '@/components/photo-uploader'
import { PhotoDetailModal } from '@/components/photo-detail-modal'
import Link from 'next/link'
import { photoCardSurfaceClass, type PhotoData } from '@/components/photo-card'
import { PhotoGridSkeleton } from '@/components/skeleton/photo-grid-skeleton'

type Photo = PhotoData

interface Album {
  id: string
  title: string
  description: string | null
}

type Translator = (key: string, values?: Record<string, string | number>) => string

export function buildAlbumDetailUiText(t: Translator) {
  return {
    photoCount: (count: number) => t('photoCount', { count }),
    selectedCount: (count: number) => t('selectedCount', { count }),
    moveSelected: t('moveSelected'),
    deleteSelected: t('deleteSelected'),
    reorder: t('reorder'),
  }
}

export default function AlbumDetailPage() {
  const t = useTranslations('AlbumDetailPage')
  const params = useParams()
  const router = useRouter()
  const albumId = params.albumId as string

  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [album, setAlbum] = useState<Album | null>(null)
  const [allAlbums, setAllAlbums] = useState<Array<{ id: string; title: string }>>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [mode, setMode] = useState<'browse' | 'select' | 'reorder'>('browse')
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [moving, setMoving] = useState(false)
  const [targetAlbumId, setTargetAlbumId] = useState<string>('')
  const [reorderSnapshot, setReorderSnapshot] = useState<Photo[]>([])
  const [draggingPhotoId, setDraggingPhotoId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const uiText = buildAlbumDetailUiText(t)

  useEffect(() => {
    async function fetchData() {
      const coupleRes = await fetch('/api/couples/mine')
      if (!coupleRes.ok) return
      const couple = await coupleRes.json()
      setCoupleId(couple.id)

      const [albumRes, photosRes] = await Promise.all([
        fetch(`/api/couples/${couple.id}/albums/${albumId}`),
        fetch(`/api/couples/${couple.id}/photos?albumId=${albumId}&limit=100`),
      ])

      if (albumRes.ok) setAlbum(await albumRes.json())
      if (photosRes.ok) {
        const data = await photosRes.json()
        setPhotos(data.photos)
      }
      const albumsRes = await fetch(`/api/couples/${couple.id}/albums`)
      if (albumsRes.ok) {
        const albumsData = await albumsRes.json()
        setAllAlbums(
          (albumsData.albums ?? []).map((item: { id: string; title: string }) => ({
            id: item.id,
            title: item.title,
          }))
        )
      }
      setLoading(false)
    }
    fetchData()
  }, [albumId, refreshKey])

  useEffect(() => {
    if (!coupleId) return
    if (mode === 'reorder') return
    const processing = photos.filter(p => p.status === 'PROCESSING')
    if (processing.length === 0) return

    const interval = setInterval(async () => {
      const res = await fetch(`/api/couples/${coupleId}/photos?albumId=${albumId}&limit=100`)
      if (res.ok) {
        const data = await res.json()
        setPhotos(data.photos)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [coupleId, albumId, photos, mode])

  useEffect(() => {
    if (!loading && !album) router.push('/albums')
  }, [loading, album, router])

  function togglePhotoSelection(photoId: string) {
    setSelectedPhotoIds(prev =>
      prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    )
  }

  async function handleBatchDelete() {
    if (!coupleId || selectedPhotoIds.length === 0 || deleting) return
    if (!confirm(t('deleteSelectedConfirm', { count: selectedPhotoIds.length }))) return

    setActionError(null)
    setDeleting(true)

    const res = await fetch(`/api/couples/${coupleId}/photos/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'DELETE',
        photoIds: selectedPhotoIds,
      }),
    })

    setDeleting(false)

    if (res.ok) {
      setSelectedPhotoIds([])
      setMode('browse')
      setRefreshKey(key => key + 1)
      return
    }

    const data = await res.json().catch(() => null)
    setActionError(data?.error?.message || t('deleteFailed'))
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

  async function handleBatchMove() {
    if (!coupleId || selectedPhotoIds.length === 0 || !targetAlbumId || moving) return

    setActionError(null)
    setMoving(true)
    const res = await fetch(`/api/couples/${coupleId}/photos/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'MOVE',
        photoIds: selectedPhotoIds,
        targetAlbumId,
      }),
    })
    setMoving(false)

    if (res.ok) {
      setSelectedPhotoIds([])
      setTargetAlbumId('')
      setMode('browse')
      setRefreshKey(key => key + 1)
      return
    }

    const data = await res.json().catch(() => null)
    setActionError(data?.error?.message || t('moveFailed'))
  }

  function enterReorderMode() {
    setReorderSnapshot(photos)
    setMode('reorder')
  }

  function cancelReorderMode() {
    setPhotos(reorderSnapshot)
    setReorderSnapshot([])
    setMode('browse')
    setDraggingPhotoId(null)
  }

  function handleDropOnPhoto(targetPhotoId: string) {
    if (!draggingPhotoId || draggingPhotoId === targetPhotoId) return

    setPhotos(prev => {
      const sourceIndex = prev.findIndex(photo => photo.id === draggingPhotoId)
      const targetIndex = prev.findIndex(photo => photo.id === targetPhotoId)
      if (sourceIndex === -1 || targetIndex === -1) return prev

      const next = [...prev]
      const [moved] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
    setDraggingPhotoId(null)
  }

  async function saveReorder() {
    if (!coupleId || savingOrder) return
    setActionError(null)
    setSavingOrder(true)
    const res = await fetch(`/api/couples/${coupleId}/albums/${albumId}/photos/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderedPhotoIds: photos.map(photo => photo.id),
      }),
    })
    setSavingOrder(false)

    if (res.ok) {
      setReorderSnapshot([])
      setMode('browse')
      setRefreshKey(key => key + 1)
      return
    }

    const data = await res.json().catch(() => null)
    setActionError(data?.error?.message || t('saveOrderFailed'))
  }

  if (loading) return <PhotoGridSkeleton />
  if (!album) return null

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-warm-muted">
          {uiText.photoCount(photos.length)}
        </div>
        <div className="flex items-center gap-2">
          {mode === 'select' ? (
            <>
              <span className="text-sm text-warm-muted">
                {uiText.selectedCount(selectedPhotoIds.length)}
              </span>
              <select
                value={targetAlbumId}
                onChange={e => setTargetAlbumId(e.target.value)}
                className="px-3 py-2 text-sm rounded-[var(--radius-md)] border border-warm-border bg-warm-surface text-warm-text"
              >
                <option value="">{t('targetAlbumPlaceholder')}</option>
                {allAlbums
                  .filter(item => item.id !== albumId)
                  .map(item => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleBatchMove}
                disabled={selectedPhotoIds.length === 0 || !targetAlbumId || moving}
                className="px-3 py-2 text-sm text-white bg-info rounded-[var(--radius-md)]
                  disabled:opacity-50 transition-colors"
              >
                {moving ? t('moving') : t('moveSelected')}
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={selectedPhotoIds.length === 0 || deleting}
                className="px-3 py-2 text-sm text-white bg-error rounded-[var(--radius-md)]
                  disabled:opacity-50 transition-colors"
              >
                {deleting ? t('deleting') : t('deleteSelected')}
              </button>
              <button
                onClick={() => {
                  setMode('browse')
                  setSelectedPhotoIds([])
                  setTargetAlbumId('')
                }}
                className="px-3 py-2 text-sm text-warm-muted border border-warm-border
                  rounded-[var(--radius-md)] hover:bg-warm-bg transition-colors"
              >
                {t('cancelSelect')}
              </button>
            </>
          ) : mode === 'reorder' ? (
            <>
              <span className="text-sm text-warm-muted">{t('dragToReorder')}</span>
              <button
                onClick={saveReorder}
                disabled={savingOrder}
                className="px-3 py-2 text-sm text-white bg-warm-accent rounded-[var(--radius-md)]
                  disabled:opacity-50 transition-colors"
              >
                {savingOrder ? t('saving') : t('saveOrder')}
              </button>
              <button
                onClick={cancelReorderMode}
                className="px-3 py-2 text-sm text-warm-muted border border-warm-border
                  rounded-[var(--radius-md)] hover:bg-warm-bg transition-colors"
              >
                {t('cancelReorder')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setMode('select')}
                className="px-3 py-2 text-sm text-warm-accent border border-warm-accent
                  rounded-[var(--radius-md)] hover:bg-warm-accent/10 transition-colors"
              >
                {t('selectPhotos')}
              </button>
              <button
                onClick={enterReorderMode}
                className="px-3 py-2 text-sm text-warm-text border border-warm-border
                  rounded-[var(--radius-md)] hover:bg-warm-bg transition-colors"
              >
                {uiText.reorder}
              </button>
            </>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {actionError}
        </div>
      )}

      {coupleId && (
        <div className="mb-6">
          <PhotoUploader
            coupleId={coupleId}
            albumId={albumId}
            onUploaded={() => setRefreshKey(k => k + 1)}
          />
        </div>
      )}

      {photos.length === 0 ? (
        <div className="text-center py-16 bg-warm-surface rounded-[var(--radius-lg)] border border-warm-border">
          <p className="text-warm-muted">{t('empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map(photo => (
            <div
              key={photo.id}
              onClick={() => {
                if (mode === 'select') {
                  togglePhotoSelection(photo.id)
                  return
                }
                setSelectedPhoto(photo)
              }}
              className={`relative cursor-pointer rounded-[var(--radius-md)] overflow-hidden group
                ${photoCardSurfaceClass} aspect-square`}
              draggable={mode === 'reorder'}
              onDragStart={() => setDraggingPhotoId(photo.id)}
              onDragOver={e => {
                if (mode === 'reorder') e.preventDefault()
              }}
              onDrop={() => {
                if (mode === 'reorder') handleDropOnPhoto(photo.id)
              }}
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
                    {photo.status === 'PROCESSING' ? t('processing') : t('noPreview')}
                  </span>
                </div>
              )}

              {photo.status !== 'READY' && (
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium text-white
                  ${photo.status === 'PROCESSING' ? 'bg-info' : 'bg-error'}`}>
                  {photo.status === 'PROCESSING' ? t('processingShort') : t('failed')}
                </div>
              )}

              {photo.isAlbumCover && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium text-white bg-warm-text/80">
                  {t('cover')}
                </div>
              )}

              {mode === 'select' && (
                <div className="absolute left-2 bottom-2">
                  <div className={`w-5 h-5 rounded-full border-2 transition-colors ${
                    selectedPhotoIds.includes(photo.id)
                      ? 'bg-warm-accent border-warm-accent'
                      : 'bg-white/80 border-white'
                  }`} />
                </div>
              )}

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
            </div>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <PhotoDetailModal
          photo={selectedPhoto}
          coupleId={coupleId ?? ''}
          onClose={() => setSelectedPhoto(null)}
          onUpdated={() => {
            setSelectedPhoto(null)
            setRefreshKey(key => key + 1)
          }}
          onSetCover={handleSetCover}
        />
      )}
    </div>
  )
}
