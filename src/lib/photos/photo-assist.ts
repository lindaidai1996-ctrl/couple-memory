type PhotoAssistInput = {
  chapterTitle?: string | null
  momentContext?: string | null
  momentPromptAnswer?: string | null
  aiScene?: string | null
  locationName?: string | null
}

export function buildUngroupedSuggestions(input: PhotoAssistInput) {
  const base = input.momentContext?.trim() || input.momentPromptAnswer?.trim()

  if (base) {
    return [
      base,
      `想把这一刻留下来${input.locationName ? `，在${input.locationName}` : ''}。`,
    ].filter(Boolean)
  }

  if (input.aiScene?.trim()) {
    return [
      `那天的${input.aiScene.trim()}，值得单独留下。`,
      '这张照片可以先作为一个还没归进章节的小瞬间。',
    ]
  }

  return [
    '这是一个值得先留下来的瞬间。',
    '如果你愿意，也可以补一句这张照片为什么重要。',
  ]
}

export function buildChapterAwareSuggestions(input: PhotoAssistInput) {
  if (!input.chapterTitle) {
    return buildUngroupedSuggestions(input)
  }

  return [
    `这张照片属于“${input.chapterTitle}”这一段回忆。`,
    input.momentContext?.trim() || '它可以在章节里作为一个更具体的瞬间表达。',
  ]
}
