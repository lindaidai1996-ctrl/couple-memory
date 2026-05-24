'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button, PlusIcon, TrashIcon } from '@/components/ui/button'

interface Album {
  id: string
  title: string
  description: string | null
  photoCount: number
  coverPhotoUrl: string | null
  createdAt: string
}

type Translator = (key: string, values?: Record<string, string | number>) => string

export function buildAlbumsUiText(t: Translator) {
  return {
    title: t('title'),
    create: t('create'),
    empty: t('empty'),
  }
}

export default function AlbumsPage() {
  const t = useTranslations('AlbumsPage')
  const [albums, setAlbums] = useState<Album[]>([])
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function fetchData() {
      const coupleRes = await fetch('/api/couples/mine')
      if (!coupleRes.ok) return setLoading(false)
      const couple = await coupleRes.json()
      setCoupleId(couple.id)

      const albumsRes = await fetch(`/api/couples/${couple.id}/albums`)
      if (albumsRes.ok) {
        const data = await albumsRes.json()
        setAlbums(data.albums)
      }
      setLoading(false)
    }
    fetchData()
  }, [refreshKey])

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!coupleId) return
    const formData = new FormData(e.currentTarget)

    const res = await fetch(`/api/couples/${coupleId}/albums`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formData.get('title'),
        description: formData.get('description') || undefined,
      }),
    })

    if (res.ok) {
      setShowCreate(false)
      setRefreshKey(k => k + 1)
    }
  }

  async function handleDelete(albumId: string) {
    if (!coupleId || !confirm(t('deleteConfirm'))) return

    await fetch(`/api/couples/${coupleId}/albums/${albumId}`, {
      method: 'DELETE',
    })
    setRefreshKey(k => k + 1)
  }

  if (loading) return <AlbumsSkeleton />
  const uiText = buildAlbumsUiText(t)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-warm-text">{uiText.title}</h1>
        <Button
          onClick={() => setShowCreate(true)}
          variant="brand"
          leadingIcon={<PlusIcon />}
        >
          {uiText.create}
        </Button>
      </div>

      {albums.length === 0 ? (
        <div className="text-center py-20 bg-warm-surface rounded-[var(--radius-lg)] border border-warm-border">
          <p className="text-warm-muted mb-4">{uiText.empty}</p>
          <Button
            onClick={() => setShowCreate(true)}
            variant="secondary"
            leadingIcon={<PlusIcon />}
          >
            {uiText.create}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map(album => (
            <Link
              key={album.id}
              href={`/albums/${album.id}`}
              className="group bg-warm-surface rounded-[var(--radius-lg)] border border-warm-border
                overflow-hidden hover:shadow-md transition-all duration-200"
            >
              <div className="aspect-[4/3] bg-warm-bg relative overflow-hidden">
                {album.coverPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={album.coverPhotoUrl}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1" className="text-warm-border">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-warm-text">{album.title}</h3>
                    {album.description && (
                      <p className="text-xs text-warm-muted mt-1 line-clamp-2">{album.description}</p>
                    )}
                  </div>
                  <Button
                    onClick={e => { e.preventDefault(); handleDelete(album.id) }}
                    className="opacity-0 group-hover:opacity-100"
                    title={t('deleteTitle')}
                    aria-label={t('deleteTitle')}
                    variant="ghost"
                    size="xs"
                    iconOnly
                  >
                    <TrashIcon />
                  </Button>
                </div>
                <p className="text-xs text-warm-muted mt-2">
                  {t('photoCount', { count: album.photoCount })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 创建弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowCreate(false)} />
          <div className="relative bg-warm-surface rounded-[var(--radius-xl)] shadow-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-warm-text mb-4">{t('createTitle')}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-text mb-1.5">{t('fieldTitle')}</label>
                <input
                  name="title"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-warm-border
                    bg-warm-bg text-warm-text placeholder:text-warm-muted/60
                    focus:ring-2 focus:ring-warm-accent/30 focus:border-warm-accent outline-none
                    transition-all duration-200 text-sm"
                  placeholder={t('fieldTitlePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-text mb-1.5">{t('fieldDescription')}</label>
                <textarea
                  name="description"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-warm-border
                    bg-warm-bg text-warm-text placeholder:text-warm-muted/60
                    focus:ring-2 focus:ring-warm-accent/30 focus:border-warm-accent outline-none
                    transition-all duration-200 text-sm resize-none"
                  placeholder={t('fieldDescriptionPlaceholder')}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => setShowCreate(false)}
                  className="flex-1"
                  variant="secondary"
                  fullWidth
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  variant="brand"
                  fullWidth
                  leadingIcon={<PlusIcon />}
                >
                  {t('submit')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function AlbumsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex justify-between mb-6">
        <div className="h-8 bg-warm-border rounded w-20" />
        <div className="h-9 bg-warm-border rounded w-24" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-warm-surface rounded-[var(--radius-lg)] border border-warm-border overflow-hidden">
            <div className="aspect-[4/3] bg-warm-border" />
            <div className="p-4 space-y-2">
              <div className="h-5 bg-warm-border rounded w-2/3" />
              <div className="h-3 bg-warm-border rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
