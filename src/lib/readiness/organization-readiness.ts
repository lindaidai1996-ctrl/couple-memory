export type OrganizationReadinessAction = {
  label: string
  href: string
}

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
      actions: [{ label: '去相册上传照片', href: '/albums' }],
    }
  }

  const chapterCoverage = Math.round((chapterPhotoCount / totalPhotos) * 100)
  const suggestions: string[] = []
  const actions: OrganizationReadinessAction[] = []

  if (chapterCount === 0) {
    suggestions.push('还没有章节，可以先从几张相关照片开始整理出一段回忆。')
    actions.push({ label: '去整理相册章节', href: '/albums' })
  }
  if (chapterCoverage < 40) {
    suggestions.push('还有不少照片停留在“其他瞬间”，可以继续整理章节。')
    actions.push({ label: '继续整理其他瞬间', href: '/albums' })
  }

  return {
    score: Math.min(100, Math.max(0, Math.round((chapterCoverage * 0.7) + (Math.min(chapterCount, 5) * 6)))),
    suggestions,
    actions,
  }
}
