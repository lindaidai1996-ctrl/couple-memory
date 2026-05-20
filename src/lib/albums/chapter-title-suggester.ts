type ChapterTitleSuggestionInput = {
  albumTitle: string
  photoCount: number
  backgroundNote?: string | null
  scenes?: string[]
  locations?: string[]
}

function buildFallbackSuggestions(input: ChapterTitleSuggestionInput) {
  const location = input.locations?.find(Boolean)
  const scene = input.scenes?.find(Boolean)

  const candidates = [
    location ? `${location}的一个瞬间` : null,
    scene ? `${scene}的那天` : null,
    input.photoCount === 1 ? '想留下来的这一刻' : '这一段想留下来的回忆',
  ].filter((item): item is string => Boolean(item))

  return candidates.slice(0, 2)
}

export async function suggestChapterTitles(input: ChapterTitleSuggestionInput) {
  return buildFallbackSuggestions(input)
}
