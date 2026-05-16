'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PhotoUploader } from '@/components/photo-uploader'
import { PhotoDetailModal } from '@/components/photo-detail-modal'
import Link from 'next/link'
import type { PhotoData } from '@/components/photo-card'

type Photo = PhotoData

interface Album {
  id: string
  title: string
  description: string | null
}

export default function AlbumDetailPage() {
  const params = useParams()
  const router = useRouter()
  const albumId = params.albumId as string

  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [mode, setMode] = useState<'browse' | 'select'>('browse')
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)

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
      setLoading(false)
    }
    fetchData()
  }, [albumId, refreshKey])

  useEffect(() => {
    if (!coupleId) return
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
  }, [coupleId, albumId, photos])

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
    if (!confirm(`确定删除已选的 ${selectedPhotoIds.length} 张照片吗？`)) return

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
    }
  }

  async function handleSetCover(photoId: string) {
    if (!coupleId) return

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
    }
  }

  if (loading) return <DetailSkeleton />
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
          共 {photos.length} 张照片
        </div>
        <div className="flex items-center gap-2">
          {mode === 'select' ? (
            <>
              <span className="text-sm text-warm-muted">
                已选 {selectedPhotoIds.length} 张
              </span>
              <button
                onClick={handleBatchDelete}
                disabled={selectedPhotoIds.length === 0 || deleting}
                className="px-3 py-2 text-sm text-white bg-error rounded-[var(--radius-md)]
                  disabled:opacity-50 transition-colors"
              >
                {deleting ? '删除中...' : '删除已选'}
              </button>
              <button
                onClick={() => {
                  setMode('browse')
                  setSelectedPhotoIds([])
                }}
                className="px-3 py-2 text-sm text-warm-muted border border-warm-border
                  rounded-[var(--radius-md)] hover:bg-warm-bg transition-colors"
              >
                取消选择
              </button>
            </>
          ) : (
            <button
              onClick={() => setMode('select')}
              className="px-3 py-2 text-sm text-warm-accent border border-warm-accent
                rounded-[var(--radius-md)] hover:bg-warm-accent/10 transition-colors"
            >
              选择照片
            </button>
          )}
        </div>
      </div>

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
          <p className="text-warm-muted">还没有照片，上传一些吧</p>
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
              className="relative cursor-pointer rounded-[var(--radius-md)] overflow-hidden group
                bg-warm-border aspect-square"
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
                    {photo.status === 'PROCESSING' ? '处理中...' : '无预览'}
                  </span>
                </div>
              )}

              {photo.status !== 'READY' && (
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium text-white
                  ${photo.status === 'PROCESSING' ? 'bg-info' : 'bg-error'}`}>
                  {photo.status === 'PROCESSING' ? '处理中' : '失败'}
                </div>
              )}

              {photo.isAlbumCover && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium text-white bg-warm-text/80">
                  封面
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

function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-warm-border rounded" />
        <div className="h-8 bg-warm-border rounded w-32" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square bg-warm-border rounded-[var(--radius-md)]" />
        ))}
      </div>
    </div>
  )
}
