type ChapterSummaryInput = {
  title: string
  backgroundNote?: string | null
  photoCount: number
  scenes: string[]
  locations: string[]
}

function fallbackSummary(input: ChapterSummaryInput) {
  if (input.backgroundNote?.trim()) {
    return input.backgroundNote.trim()
  }

  const location = input.locations.find(Boolean)
  const scene = input.scenes.find(Boolean)

  if (location && scene) {
    return `这一段回忆发生在${location}，围绕${scene}展开，共收进了 ${input.photoCount} 张照片。`
  }

  return `这一段回忆收进了 ${input.photoCount} 张照片，适合作为这一阶段里的一段小故事。`
}

export async function generateChapterSummary(input: ChapterSummaryInput) {
  return fallbackSummary(input)
}
