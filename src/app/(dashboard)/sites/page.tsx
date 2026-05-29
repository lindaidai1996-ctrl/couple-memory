'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Button, CheckIcon, SparklesIcon, buttonClassName } from '@/components/ui/button'
import type { MemorySiteListItem } from '@/lib/memory-sites/site-mappers'
import { buildPublicMemorySitePath } from '@/lib/public-routes'

type MemorySiteAlbumChapter = {
  id: string
  title: string
  eligiblePhotoCount?: number
}

type MemorySiteAlbum = {
  id: string
  title: string
  photoCount?: number
  chapters?: MemorySiteAlbumChapter[]
  memorySiteReadiness?: {
    chapterCount: number
    eligiblePhotoCount: number
  }
}

type MemorySiteChapterOption = {
  id: string
  title: string
  eligiblePhotoCount: number
  eligible: boolean
  reasonKey: 'ineligibleNoReadyPhotos' | null
}

type MemorySiteAlbumOption = {
  id: string
  title: string
  photoCount: number
  chapterCount: number
  eligiblePhotoCount: number
  eligible: boolean
  reasonKey: 'ineligibleNoChapters' | 'ineligibleNoReadyPhotos' | null
  chapters: MemorySiteChapterOption[]
}

type Translator = (
  key: string,
  values?: Record<string, string | number | Date>
) => string

export function buildMemorySitesUiText(t: Translator) {
  return {
    title: t('title'),
    subtitle: t('subtitle'),
    generate: t('generate'),
    empty: t('empty'),
    emptyNoAlbums: t('emptyNoAlbums'),
    emptyNoEligibleAlbums: t('emptyNoEligibleAlbums'),
    publishLocked: t('publishLocked'),
    pickerTitle: t('pickerTitle'),
    pickerHint: t('pickerHint'),
    pickerSummary: t('pickerSummary', {
      chapterCount: '{chapterCount}',
      albumCount: '{albumCount}',
    }),
    albumSelectAll: t('albumSelectAll'),
    albumClear: t('albumClear'),
    albumMeta: t('albumMeta', {
      photoCount: '{photoCount}',
      chapterCount: '{chapterCount}',
      eligiblePhotoCount: '{eligiblePhotoCount}',
    }),
    chapterMeta: t('chapterMeta', {
      eligiblePhotoCount: '{eligiblePhotoCount}',
    }),
    eligible: t('eligible'),
    selected: t('selected'),
    chapterLabel: t('chapterLabel'),
    ineligibleNoChapters: t('ineligibleNoChapters'),
    ineligibleNoReadyPhotos: t('ineligibleNoReadyPhotos'),
    generateFailed: t('generateFailed'),
    openDraft: t('openDraft'),
    openPublicPage: t('openPublicPage'),
  }
}

export function buildMemorySiteCardAction(
  site: Pick<MemorySiteListItem, 'id' | 'status'>,
  publicHref: string | null
) {
  if (site.status === 'PUBLISHED' && publicHref) {
    return {
      href: publicHref,
      label: 'openPublicPage',
      external: true,
    } as const
  }

  return {
    href: `/sites/${site.id}`,
    label: 'openDraft',
    external: false,
  } as const
}

export function parseMemorySiteAlbumsResponse(payload: unknown): MemorySiteAlbum[] {
  if (Array.isArray(payload)) {
    return payload as MemorySiteAlbum[]
  }

  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { albums?: unknown[] }).albums)
  ) {
    return (payload as { albums: MemorySiteAlbum[] }).albums
  }

  return []
}

export function buildMemorySiteAlbumOptions(albums: MemorySiteAlbum[]): MemorySiteAlbumOption[] {
  return albums.map(album => {
    const chapters: MemorySiteChapterOption[] = (album.chapters ?? []).map(chapter => {
      const eligiblePhotoCount = chapter.eligiblePhotoCount ?? 0
      const reasonKey: MemorySiteChapterOption['reasonKey'] =
        eligiblePhotoCount > 0 ? null : 'ineligibleNoReadyPhotos'

      return {
        id: chapter.id,
        title: chapter.title,
        eligiblePhotoCount,
        eligible: reasonKey === null,
        reasonKey,
      }
    })

    const chapterCount = chapters.length
    const eligiblePhotoCount = chapters.reduce((sum, chapter) => sum + chapter.eligiblePhotoCount, 0)
    const eligibleChapterCount = chapters.filter(chapter => chapter.eligible).length
    const reasonKey: MemorySiteAlbumOption['reasonKey'] =
      chapterCount === 0
        ? 'ineligibleNoChapters'
        : eligibleChapterCount === 0
          ? 'ineligibleNoReadyPhotos'
          : null

    return {
      id: album.id,
      title: album.title,
      photoCount: album.photoCount ?? 0,
      chapterCount,
      eligiblePhotoCount,
      eligible: reasonKey === null,
      reasonKey,
      chapters,
    }
  })
}

export function pickInitialMemorySiteChapterIds(options: MemorySiteAlbumOption[]) {
  return options.find(option => option.eligible)?.chapters
    .filter(chapter => chapter.eligible)
    .map(chapter => chapter.id) ?? []
}

export function resolveMemorySiteGenerationError(
  payload: unknown,
  fallbackMessage: string
) {
  if (
    payload &&
    typeof payload === 'object' &&
    typeof (payload as { error?: unknown }).error === 'string'
  ) {
    return (payload as { error: string }).error
  }

  return fallbackMessage
}

export function buildMemorySitesEmptyMessage(
  input: {
    hasAlbums: boolean
    hasEligibleAlbums: boolean
  },
  uiText: ReturnType<typeof buildMemorySitesUiText>
) {
  if (!input.hasAlbums) {
    return uiText.emptyNoAlbums
  }

  if (!input.hasEligibleAlbums) {
    return uiText.emptyNoEligibleAlbums
  }

  return uiText.empty
}

export function summarizeMemorySiteSelection(
  options: MemorySiteAlbumOption[],
  selectedChapterIds: string[],
  template: string
) {
  const selectedSet = new Set(selectedChapterIds)
  const chapterCount = selectedSet.size
  const albumCount = options.filter(option =>
    option.chapters.some(chapter => selectedSet.has(chapter.id))
  ).length

  return template
    .replace('{chapterCount}', String(chapterCount))
    .replace('{albumCount}', String(albumCount))
}

function toggleIds(current: string[], nextIds: string[], forceSelected?: boolean) {
  const currentSet = new Set(current)
  const shouldSelect =
    forceSelected ?? nextIds.some(id => !currentSet.has(id))

  if (shouldSelect) {
    nextIds.forEach(id => currentSet.add(id))
  } else {
    nextIds.forEach(id => currentSet.delete(id))
  }

  return [...currentSet]
}

export default function MemorySitesPage() {
  const t = useTranslations('MemorySitesPage')
  const uiText = buildMemorySitesUiText(t)
  const [sites, setSites] = useState<MemorySiteListItem[]>([])
  const [albums, setAlbums] = useState<MemorySiteAlbum[]>([])
  const [userSelectedChapterIds, setUserSelectedChapterIds] = useState<string[]>([])
  const [hasTouchedSelection, setHasTouchedSelection] = useState(false)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [publicSiteHref, setPublicSiteHref] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      const coupleRes = await fetch('/api/couples/mine')
      if (!coupleRes.ok) {
        setLoading(false)
        return
      }

      const couple = await coupleRes.json()
      setCoupleId(couple.id)
      setPublicSiteHref(couple.slug ? buildPublicMemorySitePath(couple.slug) : null)

      const [sitesRes, albumsRes] = await Promise.all([
        fetch(`/api/couples/${couple.id}/memory-sites`),
        fetch(`/api/couples/${couple.id}/albums`),
      ])

      if (sitesRes.ok) {
        const data = await sitesRes.json()
        setSites(data.sites ?? [])
      }

      if (albumsRes.ok) {
        const data = await albumsRes.json()
        setAlbums(parseMemorySiteAlbumsResponse(data))
      }

      setLoading(false)
    }

    fetchData()
  }, [refreshKey])

  const albumOptions = useMemo(() => buildMemorySiteAlbumOptions(albums), [albums])
  const effectiveSelectedChapterIds = hasTouchedSelection
    ? userSelectedChapterIds
    : pickInitialMemorySiteChapterIds(albumOptions)
  const selectedChapterIdSet = new Set(effectiveSelectedChapterIds)
  const hasEligibleAlbums = albumOptions.some(album => album.eligible)

  async function handleGenerate() {
    if (!coupleId || effectiveSelectedChapterIds.length === 0) return

    setSubmitting(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`/api/couples/${coupleId}/memory-sites/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterIds: effectiveSelectedChapterIds,
          style: 'VELVET_PLUM_EDITORIAL',
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        setErrorMessage(resolveMemorySiteGenerationError(payload, uiText.generateFailed))
        return
      }

      setRefreshKey(key => key + 1)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse rounded-[var(--radius-xl)] bg-warm-surface p-8 text-warm-muted">{uiText.title}</div>
  }

  return (
    <div className="space-y-6">
      <section className="dashboard-surface-card rounded-[28px] px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-warm-muted">Memory Sites</p>
            <h1 className="dashboard-page-title mt-3 text-warm-text">
              {uiText.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-warm-muted">{uiText.subtitle}</p>
            {albumOptions.length > 0 ? (
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-warm-muted">
                {summarizeMemorySiteSelection(
                  albumOptions,
                  effectiveSelectedChapterIds,
                  uiText.pickerSummary
                )}
              </p>
            ) : null}
          </div>
          <Button
            onClick={handleGenerate}
            loading={submitting}
            disabled={submitting || effectiveSelectedChapterIds.length === 0}
            variant="brand"
            pill
            leadingIcon={<SparklesIcon />}
          >
            {uiText.generate}
          </Button>
        </div>
      </section>

      {albumOptions.length > 0 ? (
        <section className="dashboard-surface-card rounded-[24px] px-6 py-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="dashboard-section-title text-warm-text">
                {uiText.pickerTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-warm-muted">
                {uiText.pickerHint}
              </p>
            </div>

            <div className="grid gap-3">
              {albumOptions.map(album => {
                const eligibleChapterIds = album.chapters
                  .filter(chapter => chapter.eligible)
                  .map(chapter => chapter.id)
                const selectedCount = eligibleChapterIds.filter(id => selectedChapterIdSet.has(id)).length
                const allSelected = eligibleChapterIds.length > 0 && selectedCount === eligibleChapterIds.length

                return (
                  <article
                    key={album.id}
                    className="memory-site-selection-panel rounded-[20px] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                          <h3 className="text-lg font-semibold text-warm-text">{album.title}</h3>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-warm-muted">
                          {uiText.albumMeta
                            .replace('{photoCount}', String(album.photoCount))
                            .replace('{chapterCount}', String(album.chapterCount))
                            .replace('{eligiblePhotoCount}', String(album.eligiblePhotoCount))}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="dashboard-chip rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-warm-muted">
                          {album.eligible ? uiText.eligible : t(album.reasonKey!)}
                        </span>
                        <Button
                          variant="secondary"
                          size="xs"
                          disabled={eligibleChapterIds.length === 0}
                          onClick={() => {
                            setHasTouchedSelection(true)
                            setErrorMessage(null)
                            setUserSelectedChapterIds(current =>
                              toggleIds(current, eligibleChapterIds, !allSelected)
                            )
                          }}
                        >
                          {allSelected ? uiText.albumClear : uiText.albumSelectAll}
                        </Button>
                      </div>
                    </div>

                    {!album.eligible ? (
                      <p className="mt-3 text-sm leading-6 text-warm-muted">
                        {t(album.reasonKey!)}
                      </p>
                    ) : null}

                    {album.chapters.length > 0 ? (
                      <div className="mt-4 grid gap-2 md:grid-cols-2">
                        {album.chapters.map(chapter => {
                          const checked = selectedChapterIdSet.has(chapter.id)
                          return (
                            <label
                              key={chapter.id}
                              className={`memory-site-selection-option flex cursor-pointer items-start gap-3 rounded-[18px] px-4 py-3 transition-colors ${
                                checked
                                  ? 'memory-site-selection-option--selected'
                                  : ''
                              } ${!chapter.eligible ? 'cursor-not-allowed opacity-70' : 'hover:border-warm-accent/40'}`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                disabled={!chapter.eligible}
                                onChange={() => {
                                  if (!chapter.eligible) return
                                  setHasTouchedSelection(true)
                                  setErrorMessage(null)
                                  setUserSelectedChapterIds(current => toggleIds(current, [chapter.id]))
                                }}
                              />
                              <span
                                aria-hidden="true"
                                className={`memory-site-checkbox mt-1 flex h-4 w-4 items-center justify-center rounded-[5px] ${
                                  checked ? 'memory-site-checkbox--checked' : ''
                                }`}
                              >
                                <CheckIcon className="h-3 w-3" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-warm-text">
                                  {chapter.title}
                                </span>
                                <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-warm-muted">
                                  {chapter.eligible
                                    ? uiText.chapterMeta.replace(
                                      '{eligiblePhotoCount}',
                                      String(chapter.eligiblePhotoCount)
                                    )
                                    : t(chapter.reasonKey!)}
                                </span>
                              </span>
                              {checked ? (
                                <span className="text-[10px] uppercase tracking-[0.2em] text-warm-muted">
                                  {uiText.selected}
                                </span>
                              ) : null}
                            </label>
                          )
                        })}
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>

            {errorMessage ? (
              <p className="rounded-[18px] border border-[color:var(--color-error)]/18 bg-[color:var(--color-error)]/6 px-4 py-3 text-sm leading-6 text-[color:var(--color-error)]">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {sites.length === 0 ? (
        <section className="dashboard-surface-card rounded-[24px] px-6 py-10 text-sm text-warm-muted">
          {buildMemorySitesEmptyMessage(
            {
              hasAlbums: albumOptions.length > 0,
              hasEligibleAlbums,
            },
            uiText
          )}
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {sites.map(site => {
            const primaryAction = buildMemorySiteCardAction(site, publicSiteHref)

            return (
              <article
                key={site.id}
                className="dashboard-surface-card-strong rounded-[24px] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.26em] text-warm-muted">
                      Memory Site
                    </p>
                    <h2 className="dashboard-section-title mt-3 text-warm-text">
                      {site.title}
                    </h2>
                  </div>
                  <span className="dashboard-chip rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-warm-muted">
                    {site.status}
                  </span>
                </div>
                {site.subtitle ? (
                  <p className="mt-3 text-sm leading-6 text-warm-muted">{site.subtitle}</p>
                ) : null}
                <p className="mt-4 text-sm leading-6 text-warm-muted">{site.intro}</p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {primaryAction.external ? (
                    <a
                      href={primaryAction.href}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonClassName({
                        variant: 'secondary',
                        size: 'sm',
                        pill: true,
                        className: 'text-[11px] uppercase tracking-[0.18em]',
                      })}
                    >
                      {uiText[primaryAction.label]}
                    </a>
                  ) : (
                    <Link
                      href={primaryAction.href}
                      className={buttonClassName({
                        variant: 'secondary',
                        size: 'sm',
                        pill: true,
                        className: 'text-[11px] uppercase tracking-[0.18em]',
                      })}
                    >
                      {uiText[primaryAction.label]}
                    </Link>
                  )}
                  {site.status === 'PUBLISHED' ? (
                    <Link
                      href={`/sites/${site.id}`}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-warm-border/80 bg-transparent px-4 text-[11px] uppercase tracking-[0.18em] text-warm-muted transition-colors hover:border-warm-border hover:text-warm-text"
                    >
                      {uiText.openDraft}
                    </Link>
                  ) : null}
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
