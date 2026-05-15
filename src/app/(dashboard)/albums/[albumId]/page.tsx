'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PhotoUploader } from '@/components/photo-uploader'
import Link from 'next/link'

interface Photo {
  id: string
  fileName: string
  thumbnailUrl: string | null
  displayUrl: string | null
  status: string
  aiCaption: string | null
  userCaption: string | null
  takenAt: string | null
  locationName: string | null
}

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

  const fetchData = useCallback(async () => {
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
  }, [albumId])

  useEffect(() => { fetchData() }, [fetchData])

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

  if (loading) return <DetailSkeleton />
  if (!album) {
    router.push('/albums')
    return null
  }

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

      {coupleId && (
        <div className="mb-6">
          <PhotoUploader
            coupleId={coupleId}
            albumId={albumId}
            onUploaded={() => fetchData()}
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
              onClick={() => setSelectedPhoto(photo)}
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

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
            </div>
          ))}
        </div>
      )}

      {/* 照片详情弹窗 — 简版，Task 25 会增强 */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedPhoto(null)} />
          <div className="relative bg-warm-surface rounded-[var(--radius-xl)] shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
            {selectedPhoto.displayUrl ? (
              <img
                src={selectedPhoto.displayUrl}
                alt={selectedPhoto.fileName}
                className="w-full max-h-[60vh] object-contain bg-black"
              />
            ) : (
              <div className="w-full h-64 bg-warm-bg flex items-center justify-center text-warm-muted">
                暂无预览
              </div>
            )}
            <div className="p-5 space-y-2">
              <p className="text-warm-text font-medium">
                {selectedPhoto.userCaption || selectedPhoto.aiCaption || selectedPhoto.fileName}
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-warm-muted">
                {selectedPhoto.locationName && <span>{selectedPhoto.locationName}</span>}
                {selectedPhoto.takenAt && (
                  <span>{new Date(selectedPhoto.takenAt).toLocaleDateString('zh-CN')}</span>
                )}
                <span className={selectedPhoto.status === 'READY' ? 'text-success' : selectedPhoto.status === 'FAILED' ? 'text-error' : 'text-info'}>
                  {selectedPhoto.status === 'READY' ? '就绪' : selectedPhoto.status === 'PROCESSING' ? '处理中' : '失败'}
                </span>
              </div>
            </div>
          </div>
        </div>
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
