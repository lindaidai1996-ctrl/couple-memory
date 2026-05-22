export type MemoryReviewType = 'YEARLY' | 'ANNIVERSARY'
export type MemoryReviewStatus = 'PROCESSING' | 'READY' | 'FAILED'

export type MemoryReviewHighlightRecord = {
  id: string
  title: string
  narrative: string
  date: string
  locationName?: string | null
  coverPhotoUrl?: string | null
}

export type MemoryReviewPayloadRecord = {
  highlights?: MemoryReviewHighlightRecord[]
  albumIds?: string[]
  chapterIds?: string[]
  milestoneIds?: string[]
  locationSummary?: {
    label: string
    count: number
  }[]
}

export type MemoryReviewRecord = {
  id: string
  type: MemoryReviewType
  scopeKey?: string
  year: number | null
  anniversaryYear: number | null
  periodStart?: Date | null
  periodEnd?: Date | null
  title: string
  subtitle: string | null
  summary: string
  closing: string
  coverPhotoUrl: string | null
  status: MemoryReviewStatus
  publishedAt: Date | null
  payload: MemoryReviewPayloadRecord | null
}

export type MemoryReviewListItem = {
  id: string
  type: MemoryReviewType
  label: string
  title: string
  subtitle: string | null
  summary: string
  closing: string
  coverPhotoUrl: string | null
  status: MemoryReviewStatus
  publishedAt: string | null
  highlights: MemoryReviewHighlightRecord[]
}

export type MemoryReviewPair = {
  yearlyReview: MemoryReviewListItem | null
  anniversaryReview: MemoryReviewListItem | null
}

function normalizePayload(payload: unknown): MemoryReviewPayloadRecord | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const source = payload as MemoryReviewPayloadRecord
  return {
    highlights: Array.isArray(source.highlights) ? source.highlights : [],
    albumIds: Array.isArray(source.albumIds) ? source.albumIds : [],
    chapterIds: Array.isArray(source.chapterIds) ? source.chapterIds : [],
    milestoneIds: Array.isArray(source.milestoneIds) ? source.milestoneIds : [],
    locationSummary: Array.isArray(source.locationSummary) ? source.locationSummary : [],
  }
}

export function buildMemoryReviewLabel({
  type,
  year,
  anniversaryYear,
}: Pick<MemoryReviewRecord, 'type' | 'year' | 'anniversaryYear'>) {
  if (type === 'YEARLY') {
    return year ? String(year) : 'Yearly'
  }

  return anniversaryYear ? `${anniversaryYear}` : 'Anniversary'
}

export function mapMemoryReview(review: MemoryReviewRecord): MemoryReviewListItem {
  const payload = normalizePayload(review.payload)

  return {
    id: review.id,
    type: review.type,
    label: buildMemoryReviewLabel(review),
    title: review.title,
    subtitle: review.subtitle,
    summary: review.summary,
    closing: review.closing,
    coverPhotoUrl: review.coverPhotoUrl,
    status: review.status,
    publishedAt: review.publishedAt?.toISOString() ?? null,
    highlights: payload?.highlights ?? [],
  }
}

export function splitMemoryReviewsByType(
  reviews: MemoryReviewRecord[]
): MemoryReviewPair {
  const items = reviews.map(mapMemoryReview)
  const yearlyReview = items.find(review => review.type === 'YEARLY') ?? null
  const anniversaryReview =
    items.find(review => review.type === 'ANNIVERSARY') ?? null

  return {
    yearlyReview,
    anniversaryReview,
  }
}
