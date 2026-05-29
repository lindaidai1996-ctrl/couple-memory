export type MemorySiteStyle = 'VELVET_PLUM_EDITORIAL'
export type MemorySiteStatus = 'DRAFT' | 'READY' | 'PUBLISHED'
export type MemorySitePhotoRole = 'hero' | 'relationship' | 'scene' | 'detail'

export type MemorySitePhotoRecord = {
  id: string
  imageUrl: string
  locationName: string | null
  takenAt: string | null
  narrative: string
  role: MemorySitePhotoRole
}

export type MemorySiteSectionRecord = {
  chapterId: string
  title: string
  summary: string
  photos: MemorySitePhotoRecord[]
}

export type MemorySitePayloadRecord = {
  style: MemorySiteStyle
  sectionCount: number
  sections: MemorySiteSectionRecord[]
  albumIds?: string[]
  chapterIds?: string[]
  selectionVariant?: number
}

export type BuildMemorySiteInput = {
  coupleName: string
  style: MemorySiteStyle
  startDate: Date | null
  selectionVariant?: number
  albums: Array<{
    id: string
    title: string
    description: string | null
    coverPhotoUrl: string | null
  }>
  chapters: Array<{
    id: string
    albumId: string
    title: string
    aiSummary: string | null
    photos: Array<{
      id: string
      displayUrl: string | null
      thumbnailUrl: string | null
      takenAt: Date | null
      locationName: string | null
      userCaption: string | null
      aiCaption: string | null
      aiMood: string | null
    }>
  }>
}

export type BuildMemorySiteResult = {
  title: string
  subtitle: string | null
  intro: string
  closing: string
  coverPhotoUrl: string | null
  payload: MemorySitePayloadRecord
  sections: MemorySiteSectionRecord[]
}

function pickPhotoRole(index: number, total: number): MemorySitePhotoRole {
  if (index === 0) return 'hero'
  if (total > 1 && index === total - 1) return 'detail'
  return index % 2 === 0 ? 'scene' : 'relationship'
}

function pickPhotoNarrative(photo: BuildMemorySiteInput['chapters'][number]['photos'][number]) {
  return (
    photo.userCaption?.trim() ||
    photo.aiCaption?.trim() ||
    '这一幕被保留下来，成为这一阶段最具体的注脚。'
  )
}

function rotateList<T>(items: T[], offset: number) {
  if (items.length <= 1) {
    return items
  }

  const safeOffset = ((offset % items.length) + items.length) % items.length
  if (safeOffset === 0) {
    return items
  }

  return [...items.slice(safeOffset), ...items.slice(0, safeOffset)]
}

function pickSiteTitle(input: BuildMemorySiteInput) {
  if (input.albums.length === 1) {
    return input.albums[0]!.title
  }

  return `${input.coupleName} 的阶段纪念站`
}

function buildSiteIntro(input: BuildMemorySiteInput) {
  const authoredDescriptions = input.albums
    .map(album => album.description?.trim())
    .filter((description): description is string => Boolean(description))

  if (authoredDescriptions.length === 1) {
    return authoredDescriptions[0]!
  }

  if (authoredDescriptions.length > 1) {
    return `${input.coupleName} 把 ${input.albums.length} 本相册里的几个阶段重新整理成了一页可以反复回看的纪念站。`
  }

  if (input.startDate) {
    const startYear = input.startDate.getUTCFullYear()
    return `${input.coupleName} 把从 ${startYear} 年开始的这段时间整理成了一页可以反复回看的纪念站。`
  }

  return `${input.coupleName} 把这段时间整理成了一页可以反复回看的纪念站。`
}

export function buildMemorySite(input: BuildMemorySiteInput): BuildMemorySiteResult {
  const selectionVariant = input.selectionVariant ?? 0
  const selectedAlbumIds = [...new Set(input.albums.map(album => album.id))]
  const selectedChapterIds = [...new Set(input.chapters.map(chapter => chapter.id))]
  const rotatedChapters = rotateList(input.chapters, selectionVariant)

  const sections = rotatedChapters
    .filter(chapter => chapter.photos.some(photo => photo.displayUrl || photo.thumbnailUrl))
    .slice(0, 7)
    .map(chapter => {
      const rotatedPhotos = rotateList(chapter.photos, selectionVariant)
      const photos = rotatedPhotos
        .filter(photo => photo.displayUrl || photo.thumbnailUrl)
        .slice(0, 7)
        .map((photo, index, all) => ({
          id: photo.id,
          imageUrl: photo.displayUrl ?? photo.thumbnailUrl ?? '',
          locationName: photo.locationName,
          takenAt: photo.takenAt?.toISOString() ?? null,
          narrative: pickPhotoNarrative(photo),
          role: pickPhotoRole(index, all.length),
        }))

      return {
        chapterId: chapter.id,
        title: chapter.title,
        summary:
          chapter.aiSummary?.trim() ||
          input.albums.find(album => album.id === chapter.albumId)?.description?.trim() ||
          '这一阶段被整理成一个可以继续阅读的篇章。',
        photos,
      }
    })
    .filter(section => section.photos.length > 0)

  if (sections.length === 0) {
    throw new Error('NOT_ENOUGH_MEMORY_SITE_CONTENT')
  }

  const coverPhotoUrl =
    input.albums.find(album => album.coverPhotoUrl)?.coverPhotoUrl ??
    sections[0]?.photos[0]?.imageUrl ??
    null
  const payload: MemorySitePayloadRecord = {
    style: input.style,
    sectionCount: sections.length,
    sections,
    albumIds: selectedAlbumIds,
    chapterIds: selectedChapterIds,
    selectionVariant,
  }

  return {
    title: pickSiteTitle(input),
    subtitle: `${input.coupleName} 的纪念站`,
    intro: buildSiteIntro(input),
    closing: '这一页先停在这里，剩下的内容会继续在你们的回忆里生长。',
    coverPhotoUrl,
    payload,
    sections,
  }
}
