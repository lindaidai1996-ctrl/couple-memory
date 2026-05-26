'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button, PlusIcon, TrashIcon } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

interface Album {
  id: string
  title: string
  description: string | null
  photoCount: number
  coverPhotoUrl: string | null
  createdAt: string
}

type Translator = (key: string, values?: Record<string, string | number>) => string

type AlbumCoverRecipe = {
  recipeKey: string
  accentKey: string
  emblemKind: 'icon'
  coverClassName: string
  overlayClassName: string
  emblemClassName: string
}

type AlbumCardVisual =
  | { kind: 'image'; url: string }
  | ({ kind: 'fallback' } & AlbumCoverRecipe)

export const ALBUM_CARD_TEXT_COLUMN_CLASS = 'min-w-0 flex-1'
export const ALBUM_CARD_DELETE_ACTION_CLASS = 'shrink-0 pl-2'

const ALBUM_FALLBACK_RECIPES: AlbumCoverRecipe[] = [
  {
    recipeKey: 'plum-dawn',
    accentKey: 'mist',
    emblemKind: 'icon',
    coverClassName:
      'bg-[linear-gradient(135deg,#4a2f42_0%,#8f607a_46%,#d7bbb7_100%)]',
    overlayClassName:
      'bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.32),transparent_34%),radial-gradient(circle_at_84%_72%,rgba(255,240,248,0.2),transparent_32%),linear-gradient(160deg,rgba(255,255,255,0.06),transparent_48%)]',
    emblemClassName:
      'border-white/20 bg-white/12 text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
  },
  {
    recipeKey: 'rose-parlor',
    accentKey: 'blush',
    emblemKind: 'icon',
    coverClassName:
      'bg-[linear-gradient(145deg,#5b3a52_0%,#9d7084_42%,#edd9d5_100%)]',
    overlayClassName:
      'bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.28),transparent_28%),radial-gradient(circle_at_18%_84%,rgba(255,225,232,0.2),transparent_30%),linear-gradient(120deg,rgba(255,255,255,0.08),transparent_44%)]',
    emblemClassName:
      'border-white/18 bg-[rgba(255,255,255,0.1)] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]',
  },
  {
    recipeKey: 'velvet-evening',
    accentKey: 'mulberry',
    emblemKind: 'icon',
    coverClassName:
      'bg-[linear-gradient(135deg,#34202f_0%,#6f4f66_48%,#c9a2a1_100%)]',
    overlayClassName:
      'bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.22),transparent_30%),radial-gradient(circle_at_76%_78%,rgba(255,235,243,0.18),transparent_28%),linear-gradient(150deg,rgba(255,255,255,0.06),transparent_42%)]',
    emblemClassName:
      'border-white/16 bg-black/10 text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]',
  },
  {
    recipeKey: 'powder-ink',
    accentKey: 'editorial',
    emblemKind: 'icon',
    coverClassName:
      'bg-[linear-gradient(140deg,#6f4f66_0%,#b88e96_44%,#f1dfda_100%)]',
    overlayClassName:
      'bg-[radial-gradient(circle_at_24%_22%,rgba(255,255,255,0.3),transparent_34%),radial-gradient(circle_at_78%_76%,rgba(111,79,102,0.14),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_46%)]',
    emblemClassName:
      'border-white/24 bg-white/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]',
  },
  {
    recipeKey: 'dark-bloom',
    accentKey: 'night',
    emblemKind: 'icon',
    coverClassName:
      'bg-[linear-gradient(135deg,#2c1625_0%,#5a3550_38%,#a97684_100%)]',
    overlayClassName:
      'bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_82%_70%,rgba(255,215,228,0.16),transparent_30%),linear-gradient(165deg,rgba(255,255,255,0.06),transparent_42%)]',
    emblemClassName:
      'border-white/14 bg-white/8 text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
  },
]

function hashAlbumSeed(seed: string) {
  let hash = 0

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }

  return hash
}

export function buildAlbumsUiText(t: Translator) {
  return {
    title: t('title'),
    create: t('create'),
    empty: t('empty'),
  }
}

export function buildAlbumFallbackCover(input: { id: string; title: string }): AlbumCoverRecipe {
  const seed = `${input.title}:${input.id}`
  const recipe = ALBUM_FALLBACK_RECIPES[hashAlbumSeed(seed) % ALBUM_FALLBACK_RECIPES.length]

  return recipe
}

export function buildAlbumCardVisual(album: Pick<Album, 'id' | 'title' | 'coverPhotoUrl'>): AlbumCardVisual {
  if (album.coverPhotoUrl) {
    return {
      kind: 'image',
      url: album.coverPhotoUrl,
    }
  }

  return {
    kind: 'fallback',
    ...buildAlbumFallbackCover({ id: album.id, title: album.title }),
  }
}

function AlbumFallbackCover({ album }: { album: Pick<Album, 'id' | 'title' | 'coverPhotoUrl'> }) {
  const coverVisual = buildAlbumCardVisual(album)
  if (coverVisual.kind !== 'fallback') {
    return null
  }

  return (
    <div className={`relative h-full w-full overflow-hidden ${coverVisual.coverClassName}`}>
      <div className={`absolute inset-0 transition-transform duration-500 group-hover:scale-105 ${coverVisual.overlayClassName}`} />
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-x-6 top-6 h-px bg-white/16" />
        <div className="absolute inset-y-6 right-7 w-px bg-white/10" />
      </div>
      <div className="absolute inset-0 flex flex-col justify-between p-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-[14px] border text-sm font-semibold tracking-[0.22em] ${coverVisual.emblemClassName}`}>
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
            <path d="M7.5 9.5h9" />
            <path d="M7.5 13h6" />
          </svg>
        </div>
        <p className="max-w-[70%] text-xl font-semibold leading-tight text-white/92">
          {album.title}
        </p>
      </div>
    </div>
  )
}

export default function AlbumsPage() {
  const t = useTranslations('AlbumsPage')
  const [albums, setAlbums] = useState<Album[]>([])
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [pendingDeleteAlbumId, setPendingDeleteAlbumId] = useState<string | null>(null)
  const [deletingAlbumId, setDeletingAlbumId] = useState<string | null>(null)
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

  async function confirmDeleteAlbum() {
    if (!coupleId || !pendingDeleteAlbumId) return

    setDeletingAlbumId(pendingDeleteAlbumId)
    await fetch(`/api/couples/${coupleId}/albums/${pendingDeleteAlbumId}`, {
      method: 'DELETE',
    })
    setDeletingAlbumId(null)
    setPendingDeleteAlbumId(null)
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
          {albums.map(album => {
            const coverVisual = buildAlbumCardVisual(album)

            return (
            <Link
              key={album.id}
              href={`/albums/${album.id}`}
              className="group bg-warm-surface rounded-[var(--radius-lg)] border border-warm-border
                overflow-hidden hover:shadow-md transition-all duration-200"
            >
              <div className="aspect-[4/3] bg-warm-bg relative overflow-hidden">
                {coverVisual.kind === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverVisual.url}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <AlbumFallbackCover album={album} />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className={ALBUM_CARD_TEXT_COLUMN_CLASS}>
                    <h3 className="font-semibold text-warm-text">{album.title}</h3>
                    {album.description && (
                      <p className="text-xs text-warm-muted mt-1 line-clamp-2">{album.description}</p>
                    )}
                  </div>
                  <div className={ALBUM_CARD_DELETE_ACTION_CLASS}>
                    <Button
                      onClick={e => { e.preventDefault(); setPendingDeleteAlbumId(album.id) }}
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
                </div>
                <p className="text-xs text-warm-muted mt-2">
                  {t('photoCount', { count: album.photoCount })}
                </p>
              </div>
            </Link>
            )
          })}
        </div>
      )}

      {/* 创建弹窗 */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={t('createTitle')}
        width="md"
        hideFooter
      >
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
      </Modal>

      <Modal
        open={pendingDeleteAlbumId !== null}
        onClose={() => setPendingDeleteAlbumId(null)}
        title={t('deleteTitle')}
        description={t('deleteConfirm')}
        confirmText={t('deleteTitle')}
        cancelText={t('cancel')}
        confirmVariant="danger"
        confirmLoading={deletingAlbumId === pendingDeleteAlbumId}
        onConfirm={confirmDeleteAlbum}
      >
        <p className="text-sm text-warm-muted">
          {albums.find(album => album.id === pendingDeleteAlbumId)?.title ?? ''}
        </p>
      </Modal>
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
