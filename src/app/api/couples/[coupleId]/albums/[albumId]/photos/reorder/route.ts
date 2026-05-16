import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'

import { withAuth } from '@/lib/api-middleware'
import { syncAlbumCover } from '@/lib/covers/album-cover-server'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

const TAG = 'albums/photos/reorder'

export const POST = withAuth(async (req, { coupleUser }, params) => {
  const requestId = randomUUID()
  const { orderedPhotoIds } = await req.json() as { orderedPhotoIds?: string[] }

  if (!Array.isArray(orderedPhotoIds) || orderedPhotoIds.length === 0) {
    return NextResponse.json({ error: { code: 'ORDERED_PHOTO_IDS_REQUIRED', message: 'orderedPhotoIds is required', retryable: false } }, { status: 400 })
  }

  const album = await prisma.album.findFirst({
    where: { id: params.albumId, coupleId: coupleUser.coupleId },
    select: { id: true },
  })

  if (!album) {
    return NextResponse.json({ error: { code: 'ALBUM_NOT_FOUND', message: 'Album not found', retryable: false } }, { status: 404 })
  }

  const existingPhotos = await prisma.photo.findMany({
    where: { albumId: album.id },
    select: { id: true },
  })

  const existingIds = existingPhotos.map(photo => photo.id).sort()
  const requestedIds = [...orderedPhotoIds].sort()

  if (existingIds.length !== requestedIds.length || existingIds.some((id, index) => id !== requestedIds[index])) {
    return NextResponse.json({ error: { code: 'ORDERED_PHOTO_IDS_MISMATCH', message: 'orderedPhotoIds must include every photo in the album exactly once', retryable: false } }, { status: 400 })
  }

  try {
    await prisma.$transaction(async tx => {
      await Promise.all(
        orderedPhotoIds.map((photoId, index) =>
          tx.photo.update({
            where: { id: photoId },
            data: { sortOrder: index + 1 },
          })
        )
      )

      await syncAlbumCover(tx, album.id)
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error(TAG, '保存照片排序失败', {
      requestId,
      coupleId: coupleUser.coupleId,
      albumId: album.id,
      orderedCount: orderedPhotoIds.length,
      error: message,
    })

    return NextResponse.json(
      {
        error: {
          code: 'REORDER_FAILED',
          message: 'Failed to save photo order',
          retryable: true,
          requestId,
        },
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
})
