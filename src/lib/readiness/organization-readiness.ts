export function buildOrganizationReadiness({
  totalPhotos,
  chapterPhotoCount,
  chapterCount,
}: {
  totalPhotos: number
  chapterPhotoCount: number
  chapterCount: number
}) {
  if (totalPhotos === 0) {
    return {
      score: 0,
      suggestions: ['先上传一些照片，再开始整理这一阶段的回忆。'],
    }
  }

  const chapterCoverage = Math.round((chapterPhotoCount / totalPhotos) * 100)
  const suggestions: string[] = []

  if (chapterCount === 0) {
    suggestions.push('还没有章节，可以先从几张相关照片开始整理出一段回忆。')
  }
  if (chapterCoverage < 40) {
    suggestions.push('还有不少照片停留在“其他瞬间”，可以继续整理章节。')
  }

  return {
    score: Math.min(100, Math.max(0, Math.round((chapterCoverage * 0.7) + (Math.min(chapterCount, 5) * 6)))),
    suggestions,
  }
}
