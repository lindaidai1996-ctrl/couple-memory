import type {
  MemoryReviewPayloadRecord,
  MemoryReviewType,
} from './review-mappers'

export type ReviewSourceMilestone = {
  id: string
  title: string
  description: string | null
  date: Date
  locationName: string | null
  photo: {
    displayUrl: string | null
    thumbnailUrl: string | null
  } | null
}

export type ReviewSourceChapter = {
  id: string
  title: string
  aiSummary: string | null
  albumId: string
}

export type ReviewSourceAlbum = {
  id: string
  title: string
  description: string | null
  coverPhotoUrl: string | null
}

export type BuildMemoryReviewInput = {
  type: MemoryReviewType
  coupleName: string
  year?: number
  anniversaryYear?: number
  startDate?: Date | null
  milestones: ReviewSourceMilestone[]
  chapters: ReviewSourceChapter[]
  albums: ReviewSourceAlbum[]
}

export type BuildMemoryReviewResult = {
  title: string
  subtitle: string | null
  summary: string
  closing: string
  coverPhotoUrl: string | null
  payload: MemoryReviewPayloadRecord
}

const MAX_HIGHLIGHTS = 6
const MIN_HIGHLIGHTS = 3

export function buildYearlyRange(year: number) {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  }
}

export function buildAnniversaryRange(startDate: Date, anniversaryYear: number) {
  const start = new Date(startDate)
  start.setUTCFullYear(start.getUTCFullYear() + anniversaryYear - 1)

  const end = new Date(startDate)
  end.setUTCFullYear(end.getUTCFullYear() + anniversaryYear)

  return { start, end }
}

export function filterMilestonesByRange(
  milestones: ReviewSourceMilestone[],
  range: { start: Date; end: Date }
) {
  return milestones.filter(
    milestone =>
      milestone.date.getTime() >= range.start.getTime() &&
      milestone.date.getTime() < range.end.getTime()
  )
}

function buildNarrativeFromMilestone(milestone: ReviewSourceMilestone) {
  const authored = milestone.description?.trim()
  if (authored) return authored

  if (milestone.locationName) {
    return `这段回忆和 ${milestone.locationName} 有关，也被留在了你们的时间线里。`
  }

  return '这是一段值得被重新翻出来阅读的阶段节点。'
}

function selectHighlights({
  milestones,
  chapters,
}: Pick<BuildMemoryReviewInput, 'milestones' | 'chapters'>) {
  const milestoneHighlights = milestones
    .sort((left, right) => right.date.getTime() - left.date.getTime())
    .slice(0, MAX_HIGHLIGHTS)
    .map(milestone => ({
      id: milestone.id,
      title: milestone.title,
      narrative: buildNarrativeFromMilestone(milestone),
      date: milestone.date.toISOString(),
      locationName: milestone.locationName,
      coverPhotoUrl:
        milestone.photo?.displayUrl ?? milestone.photo?.thumbnailUrl ?? null,
    }))

  if (milestoneHighlights.length >= MIN_HIGHLIGHTS) {
    return milestoneHighlights
  }

  const chapterFallbacks = chapters
    .filter(chapter => chapter.aiSummary?.trim())
    .slice(0, MAX_HIGHLIGHTS - milestoneHighlights.length)
    .map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      narrative: chapter.aiSummary!.trim(),
      date: '',
      locationName: null,
      coverPhotoUrl: null,
    }))

  return [...milestoneHighlights, ...chapterFallbacks].slice(0, MAX_HIGHLIGHTS)
}

function buildReviewCopy(input: BuildMemoryReviewInput, highlightCount: number) {
  if (input.type === 'YEARLY') {
    const year = input.year ?? new Date().getUTCFullYear()
    return {
      title: `${year} 年回顾`,
      subtitle: `${input.coupleName} 在这一年的共同片段`,
      summary: `这一年里，你们把 ${highlightCount} 个值得回看的片段重新整理成了一条更清楚的记忆线。`,
      closing: '这一年的故事先停在这里，接下来的部分还会继续被写进去。',
    }
  }

  const anniversaryYear = input.anniversaryYear ?? 1
  return {
    title: `第 ${anniversaryYear} 周年回顾`,
    subtitle: `${input.coupleName} 一起走过的第 ${anniversaryYear} 年`,
    summary: `围绕这一周年节点，系统把最值得回看的片段重新整理成了一份阶段回顾。`,
    closing: '这一年的纪念不只是被记录下来，也正在变成下一段回忆的起点。',
  }
}

export function buildMemoryReview(input: BuildMemoryReviewInput): BuildMemoryReviewResult {
  const highlights = selectHighlights(input)
  if (highlights.length === 0) {
    throw new Error('NOT_ENOUGH_REVIEW_CONTENT')
  }

  const copy = buildReviewCopy(input, highlights.length)
  const albumIds = [...new Set(input.albums.map(album => album.id))]
  const chapterIds = [...new Set(input.chapters.map(chapter => chapter.id))]
  const milestoneIds = [...new Set(input.milestones.map(milestone => milestone.id))]
  const coverPhotoUrl =
    highlights.find(item => item.coverPhotoUrl)?.coverPhotoUrl ??
    input.albums.find(album => album.coverPhotoUrl)?.coverPhotoUrl ??
    null

  return {
    title: copy.title,
    subtitle: copy.subtitle,
    summary: copy.summary,
    closing: copy.closing,
    coverPhotoUrl,
    payload: {
      highlights,
      albumIds,
      chapterIds,
      milestoneIds,
    },
  }
}
