import { prisma } from '@/lib/prisma'

export async function movePhotosToChapter({
  albumId,
  photoIds,
  chapterId,
}: {
  albumId: string
  photoIds: string[]
  chapterId: string
}) {
  return prisma.photo.updateMany({
    where: {
      id: { in: photoIds },
      albumId,
    },
    data: { chapterId },
  })
}

export async function ungroupPhotos({
  albumId,
  photoIds,
}: {
  albumId: string
  photoIds: string[]
}) {
  return prisma.photo.updateMany({
    where: {
      id: { in: photoIds },
      albumId,
    },
    data: { chapterId: null },
  })
}
