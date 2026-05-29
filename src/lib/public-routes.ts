export const PUBLIC_STORY_SEGMENT = 'story'
export const LEGACY_PUBLIC_STORY_SEGMENT = 's'
export const PUBLIC_STORY_BASE_PATH = `/${PUBLIC_STORY_SEGMENT}` as const

export type PublicTopicSlug = 'phases' | 'firsts' | 'footprints'
export type PublicReviewShareType = 'yearly' | 'anniversary'

function buildPublicSpaceRoute(slug: string, suffix = '') {
  return `${PUBLIC_STORY_BASE_PATH}/${slug}${suffix}`
}

export function buildPublicSpaceHomePath(slug: string) {
  return buildPublicSpaceRoute(slug)
}

export function buildPublicPhotosPath(slug: string) {
  return buildPublicSpaceRoute(slug, '/photos')
}

export function buildPublicTimelinePath(slug: string) {
  return buildPublicSpaceRoute(slug, '/timeline')
}

export function buildPublicReviewPath(slug: string) {
  return buildPublicSpaceRoute(slug, '/review')
}

export function buildPublicReviewSharePath(slug: string, type: PublicReviewShareType) {
  return buildPublicSpaceRoute(slug, `/review/share/${type}`)
}

export function buildPublicMemorySitePath(slug: string) {
  return buildPublicSpaceRoute(slug, '/site')
}

export function buildPublicTopicPath(slug: string, topic: PublicTopicSlug) {
  return buildPublicSpaceRoute(slug, `/topics/${topic}`)
}

export function buildPublicSpaceLabel(slug: string) {
  return `${PUBLIC_STORY_BASE_PATH}/${slug}`
}

