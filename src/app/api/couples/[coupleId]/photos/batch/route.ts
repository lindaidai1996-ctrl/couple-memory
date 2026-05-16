import { NextResponse } from 'next/server'

import { withAuth } from '@/lib/api-middleware'
import { syncAlbumCover } from '@/lib/covers/album-cover-server'
import { reindexPhotoSortOrders } from '@/lib/photos/sort-order'
import { prisma } from '@/lib/prisma'

type BatchAction = 'DELETE' | 'MOVE'

export const POST = withAuth(async (req, { coupleUser }) => {
  const { action, photoIds, targetAlbumId } = await req.json() as {
    action?: BatchAction
    photoIds?: string[]
    targetAlbumId?: string
  }

  if (!action || !Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json({ error: { code: 'INVALID_BATCH_REQUEST', message: 'action and photoIds are required', retryable: false } }, { status: 400 })
  }

  if (action === 'MOVE' && !targetAlbumId) {
    return NextResponse.json({ error: { code: 'TARGET_ALBUM_REQUIRED', message: 'targetAlbumId is required', retryable: false } }, { status: 400 })
  }

  const photos = await prisma.photo.findMany({
    where: {
      id: { in: photoIds },
      album: { coupleId: coupleUser.coupleId },
    },
    select: { id: true, albumId: true },
  })

  if (photos.length !== photoIds.length) {
    return NextResponse.json({ error: { code: 'PHOTO_NOT_FOUND', message: 'One or more photos were not found', retryable: false } }, { status: 404 })
  }

  if (action === 'DELETE') {
    const sourceAlbumIds = [...new Set(photos.map(photo => photo.albumId))]

    await prisma.$transaction(async tx => {
      await tx.photo.deleteMany({ where: { id: { in: photoIds } } })

      for (const albumId of sourceAlbumIds) {
        const remainingPhotos = await tx.photo.findMany({
          where: { albumId },
          select: { id: true, sortOrder: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        })

        await Promise.all(
          reindexPhotoSortOrders(remainingPhotos).map(photo =>
            tx.photo.update({
              where: { id: photo.id },
              data: { sortOrder: photo.sortOrder },
            })
          )
        )

        await syncAlbumCover(tx, albumId)
      }
    })

    return NextResponse.json({ success: true })
  }

  const targetAlbum = await prisma.album.findFirst({
    where: { id: targetAlbumId, coupleId: coupleUser.coupleId },
    select: { id: true },
  })

  if (!targetAlbum) {
    return NextResponse.json({ error: { code: 'TARGET_ALBUM_NOT_FOUND', message: 'Target album not found', retryable: false } }, { status: 404 })
  }

  const sourceAlbumIds = [...new Set(photos.map(photo => photo.albumId))]
  if (sourceAlbumIds.length !== 1) {
    return NextResponse.json({ error: { code: 'MULTI_ALBUM_BATCH_UNSUPPORTED', message: 'Batch move only supports photos from one album', retryable: false } }, { status: 400 })
  }

  const sourceAlbumId = sourceAlbumIds[0]
  if (sourceAlbumId === targetAlbum.id) {
    return NextResponse.json({ error: { code: 'TARGET_ALBUM_SAME_AS_SOURCE', message: 'Target album must be different from source album', retryable: false } }, { status: 400 })
  }

  await prisma.$transaction(async tx => {
    const targetPhotos = await tx.photo.findMany({
      where: { albumId: targetAlbum.id },
      select: { sortOrder: true },
      orderBy: [{ sortOrder: 'desc' }],
      take: 1,
    })

    const movedIdSet = new Set(photoIds)
    let nextSortOrder = (targetPhotos[0]?.sortOrder ?? 0) + 1

    for (const photoId of photoIds) {
      await tx.photo.update({
        where: { id: photoId },
        data: {
          albumId: targetAlbum.id,
          sortOrder: nextSortOrder,
        },
      })
      nextSortOrder += 1
    }

    const sourceRemainingPhotos = await tx.photo.findMany({
      where: { albumId: sourceAlbumId, id: { notIn: [...movedIdSet] } },
      select: { id: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    await Promise.all(
      reindexPhotoSortOrders(sourceRemainingPhotos).map(photo =>
        tx.photo.update({
          where: { id: photo.id },
          data: { sortOrder: photo.sortOrder },
        })
      )
    )

    await syncAlbumCover(tx, sourceAlbumId)
    await syncAlbumCover(tx, targetAlbum.id)
  })

  return NextResponse.json({ success: true })
})
