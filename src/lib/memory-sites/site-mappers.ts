import type {
  MemorySitePayloadRecord,
  MemorySiteStatus,
  MemorySiteStyle,
} from './site-builder'

export type MemorySiteRecord = {
  id: string
  scopeKey?: string
  sourceAlbumId?: string | null
  sourceChapterIds?: string[]
  style: MemorySiteStyle
  status: MemorySiteStatus
  title: string
  subtitle: string | null
  intro: string
  closing: string
  coverPhotoUrl: string | null
  payload: MemorySitePayloadRecord | null
  publishedAt: Date | null
}

export type MemorySiteListItem = {
  id: string
  scopeKey: string | null
  sourceAlbumId: string | null
  sourceChapterIds: string[]
  style: MemorySiteStyle
  status: MemorySiteStatus
  title: string
  subtitle: string | null
  intro: string
  closing: string
  coverPhotoUrl: string | null
  publishedAt: string | null
  payload: MemorySitePayloadRecord
}

function normalizePayload(payload: unknown): MemorySitePayloadRecord {
  if (!payload || typeof payload !== 'object') {
    return {
      style: 'VELVET_PLUM_EDITORIAL',
      sectionCount: 0,
      sections: [],
    }
  }

  const source = payload as Partial<MemorySitePayloadRecord>
  const sections = Array.isArray(source.sections) ? source.sections : []

  return {
    style: source.style === 'VELVET_PLUM_EDITORIAL' ? source.style : 'VELVET_PLUM_EDITORIAL',
    sectionCount: typeof source.sectionCount === 'number' ? source.sectionCount : sections.length,
    sections,
    albumIds: Array.isArray(source.albumIds) ? source.albumIds : [],
    chapterIds: Array.isArray(source.chapterIds) ? source.chapterIds : [],
    selectionVariant: typeof source.selectionVariant === 'number' ? source.selectionVariant : 0,
  }
}

export function mapMemorySite(site: MemorySiteRecord): MemorySiteListItem {
  return {
    id: site.id,
    scopeKey: site.scopeKey ?? null,
    sourceAlbumId: site.sourceAlbumId ?? null,
    sourceChapterIds: Array.isArray(site.sourceChapterIds) ? site.sourceChapterIds : [],
    style: site.style,
    status: site.status,
    title: site.title,
    subtitle: site.subtitle,
    intro: site.intro,
    closing: site.closing,
    coverPhotoUrl: site.coverPhotoUrl,
    publishedAt: site.publishedAt?.toISOString() ?? null,
    payload: normalizePayload(site.payload),
  }
}
