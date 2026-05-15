'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { PhotoStream } from '@/components/photo-stream'

interface PhotoItem {
  id: string
  displayUrl: string | null
  thumbnailUrl: string | null
  width: number | null
  height: number | null
  takenAt: string | null
  locationName: string | null
  aiCaption: string | null
  userCaption: string | null
  aiLayout: string
  aiMood: string | null
  album: { id: string; title: string }
}

export default function PhotosPage() {
  const { slug } = useParams<{ slug: string }>()
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchPhotos = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: '20' })
    if (cursor) params.set('cursor', cursor)

    const res = await fetch(`/api/public/${slug}/photos?${params}`)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json() as Promise<{ photos: PhotoItem[]; nextCursor: string | null }>
  }, [slug])

  // 首次加载
  useEffect(() => {
    fetchPhotos()
      .then(data => {
        setPhotos(data.photos)
        setNextCursor(data.nextCursor)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [fetchPhotos])

  // 无限滚动
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) {
          setLoadingMore(true)
          fetchPhotos(nextCursor)
            .then(data => {
              setPhotos(prev => [...prev, ...data.photos])
              setNextCursor(data.nextCursor)
            })
            .catch(() => {})
            .finally(() => setLoadingMore(false))
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [nextCursor, loadingMore, fetchPhotos])

  return (
    <div className="min-h-screen py-12">
      {/* 顶部导航 */}
      <header className="max-w-5xl mx-auto px-4 mb-12">
        <Link
          href={`/s/${slug}`}
          className="inline-flex items-center gap-2 text-film-muted hover:text-film-accent-light
            transition-colors text-sm mb-8"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回
        </Link>

        <motion.h1
          className="text-3xl md:text-4xl font-bold"
          style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          照片
        </motion.h1>
      </header>

      {/* 内容区域 */}
      {loading ? (
        <LoadingSpinner />
      ) : photos.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <PhotoStream photos={photos} />

          {/* 哨兵元素 + 加载状态 */}
          <div ref={sentinelRef} className="py-12 flex justify-center">
            {loadingMore && <LoadingSpinner />}
            {!nextCursor && photos.length > 0 && (
              <p className="text-film-muted text-sm">已展示全部照片</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <motion.div
        className="w-6 h-6 border-2 border-film-accent border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-24 px-6">
      <p className="text-film-muted text-lg mb-2">暂无照片</p>
      <p className="text-film-muted/60 text-sm">这里还没有上传任何照片</p>
    </div>
  )
}
