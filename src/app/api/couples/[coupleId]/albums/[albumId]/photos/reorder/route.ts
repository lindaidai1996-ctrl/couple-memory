import { NextResponse } from 'next/server'

import { withAuth } from '@/lib/api-middleware'
import { syncAlbumCover } from '@/lib/covers/album-cover-server'
import { prisma } from '@/lib/prisma'

export const POST = withAuth(async (req, { coupleUser }, params) => {
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

  return NextResponse.json({ success: true })
})
