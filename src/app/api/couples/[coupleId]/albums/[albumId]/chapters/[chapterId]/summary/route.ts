import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { generateChapterSummary } from '@/lib/albums/chapter-summary-generator'

export const POST = withAuth(async (_req, { coupleUser }, params) => {
  const chapter = await prisma.albumChapter.findFirst({
    where: {
      id: params.chapterId,
      albumId: params.albumId,
      album: { coupleId: coupleUser.coupleId },
    },
    include: {
      photos: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          aiScene: true,
          locationName: true,
        },
      },
    },
  })

  if (!chapter) {
    return NextResponse.json({ error: { code: 'CHAPTER_NOT_FOUND', message: 'Chapter not found', retryable: false } }, { status: 404 })
  }

  const summary = await generateChapterSummary({
    title: chapter.title,
    backgroundNote: chapter.backgroundNote,
    photoCount: chapter.photos.length,
    scenes: chapter.photos.map(photo => photo.aiScene ?? '').filter(Boolean),
    locations: chapter.photos.map(photo => photo.locationName ?? '').filter(Boolean),
  })

  const updated = await prisma.albumChapter.update({
    where: { id: chapter.id },
    data: { aiSummary: summary },
  })

  return NextResponse.json({ summary: updated.aiSummary })
})
