export interface StyleMemorySample {
  locationName: string | null
  aiKeywords: string[]
  selectedVariantStyle: string | null
  selectedCaptionSource: string | null
}

export interface StyleMemoryProfileInput {
  captionStylePreference: string | null
  tonePreference: string | null
  blockedPhrases: string[]
  samples: StyleMemorySample[]
}

export interface StyleCount {
  style: string
  count: number
}

export interface StyleMemoryProfile {
  coupleId?: string
  preferredStyle: string | null
  preferredTone: string | null
  blockedPhrases: string[]
  anchorKeywords: string[]
  anchorLocations: string[]
  selectedStyleCounts: StyleCount[]
  userEditedCount: number
  keptAICount: number
  sourceSampleCount: number
  summaryLines: string[]
}

const GENERIC_KEYWORDS = new Set(['照片', '情侣', '回忆', '美好时光', '幸福', '温馨', '浪漫'])

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function countTopValues(values: Array<string | null | undefined>, limit: number) {
  const counts = new Map<string, number>()
  const firstSeenOrder = new Map<string, number>()
  let index = 0

  for (const value of values) {
    const normalized = normalizeText(value)
    if (!normalized) continue
    if (!firstSeenOrder.has(normalized)) {
      firstSeenOrder.set(normalized, index)
      index += 1
    }
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1]
      return (firstSeenOrder.get(left[0]) ?? 0) - (firstSeenOrder.get(right[0]) ?? 0)
    })
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }))
}

function pickAnchorKeywords(samples: StyleMemorySample[]) {
  const keywords = samples.flatMap(sample => sample.aiKeywords)
    .map(keyword => keyword.trim())
    .filter(keyword => keyword.length >= 2 && keyword.length <= 10)
    .filter(keyword => !GENERIC_KEYWORDS.has(keyword))

  return countTopValues(keywords, 3).map(item => item.value)
}

function pickAnchorLocations(samples: StyleMemorySample[]) {
  return countTopValues(samples.map(sample => sample.locationName), 3).map(item => item.value)
}

function pickSelectedStyleCounts(samples: StyleMemorySample[]) {
  return countTopValues(samples.map(sample => sample.selectedVariantStyle), 3).map(item => ({
    style: item.value,
    count: item.count,
  }))
}

export function buildStyleMemoryPromptLines(profile: StyleMemoryProfile) {
  const lines: string[] = []

  if (profile.preferredStyle) {
    lines.push(`长期风格优先参考：${profile.preferredStyle}`)
  }
  if (profile.preferredTone) {
    lines.push(`长期语气延续：${profile.preferredTone}`)
  }
  if (profile.anchorKeywords.length > 0) {
    lines.push(`长期保留的意象：${profile.anchorKeywords.join('、')}`)
  }
  if (profile.anchorLocations.length > 0) {
    lines.push(`长期重复出现的地点：${profile.anchorLocations.join('、')}`)
  }
  if (profile.blockedPhrases.length > 0) {
    lines.push(`长期避用表达：${profile.blockedPhrases.join('、')}`)
  }

  return lines
}

export function buildStyleMemoryProfile(input: StyleMemoryProfileInput): StyleMemoryProfile {
  const selectedStyleCounts = pickSelectedStyleCounts(input.samples)
  const preferredStyle = normalizeText(input.captionStylePreference) ?? selectedStyleCounts[0]?.style ?? null
  const preferredTone = normalizeText(input.tonePreference)
  const blockedPhrases = input.blockedPhrases
    .map(phrase => phrase.trim())
    .filter(Boolean)
  const anchorKeywords = pickAnchorKeywords(input.samples)
  const anchorLocations = pickAnchorLocations(input.samples)
  const userEditedCount = input.samples.filter(sample => sample.selectedCaptionSource === 'USER').length
  const keptAICount = input.samples.filter(sample => sample.selectedCaptionSource === 'AI').length

  const baseProfile: StyleMemoryProfile = {
    preferredStyle,
    preferredTone,
    blockedPhrases,
    anchorKeywords,
    anchorLocations,
    selectedStyleCounts,
    userEditedCount,
    keptAICount,
    sourceSampleCount: input.samples.length,
    summaryLines: [],
  }

  return {
    ...baseProfile,
    summaryLines: buildStyleMemoryPromptLines(baseProfile),
  }
}

type StyleMemoryPrismaClient = {
  couple: {
    findUnique: (args: Record<string, unknown>) => Promise<{
      captionStylePreference: string | null
      tonePreference: string | null
      blockedPhrases: string[]
      albums: Array<{
        photos: Array<{
          locationName: string | null
          aiKeywords: string[]
          selectedCaptionSource: string | null
          aiVariants: Array<{ style: string | null }>
        }>
      }>
    } | null>
  }
}

export async function getStyleMemoryProfileByCoupleId(
  prismaClient: StyleMemoryPrismaClient,
  coupleId: string
) {
  const couple = await prismaClient.couple.findUnique({
    where: { id: coupleId },
    select: {
      captionStylePreference: true,
      tonePreference: true,
      blockedPhrases: true,
      albums: {
        select: {
          photos: {
            where: { status: 'READY' },
            orderBy: [{ takenAt: 'desc' }, { createdAt: 'desc' }],
            take: 48,
            select: {
              locationName: true,
              aiKeywords: true,
              selectedCaptionSource: true,
              aiVariants: {
                where: { isSelected: true, type: 'caption' },
                orderBy: { updatedAt: 'desc' },
                take: 1,
                select: { style: true },
              },
            },
          },
        },
      },
    },
  })

  if (!couple) return null

  const profile = buildStyleMemoryProfile({
    captionStylePreference: couple.captionStylePreference,
    tonePreference: couple.tonePreference,
    blockedPhrases: couple.blockedPhrases,
    samples: couple.albums.flatMap(album =>
      album.photos.map(photo => ({
        locationName: photo.locationName,
        aiKeywords: photo.aiKeywords,
        selectedVariantStyle: photo.aiVariants[0]?.style ?? null,
        selectedCaptionSource: photo.selectedCaptionSource ?? null,
      }))
    ),
  })

  return {
    ...profile,
    coupleId,
  }
}
