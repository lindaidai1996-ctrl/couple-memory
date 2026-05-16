import { NextResponse } from 'next/server'

import { withAuth } from '@/lib/api-middleware'
import { syncAlbumCover } from '@/lib/covers/album-cover-server'
import { prisma } from '@/lib/prisma'

export const PATCH = withAuth(async (req, { coupleUser }, params) => {
  const { mode, photoId } = await req.json() as { mode?: 'AUTO' | 'MANUAL'; photoId?: string }

  const album = await prisma.album.findFirst({
    where: { id: params.albumId, coupleId: coupleUser.coupleId },
    select: { id: true },
  })

  if (!album) {
    return NextResponse.json({ error: { code: 'ALBUM_NOT_FOUND', message: 'Album not found', retryable: false } }, { status: 404 })
  }

  if (mode !== 'AUTO' && mode !== 'MANUAL') {
    return NextResponse.json({ error: { code: 'INVALID_COVER_MODE', message: 'mode must be AUTO or MANUAL', retryable: false } }, { status: 400 })
  }

  if (mode === 'AUTO') {
    await prisma.$transaction(async tx => {
      await tx.album.update({
        where: { id: album.id },
        data: {
          coverMode: 'AUTO',
          coverPhotoId: null,
        },
      })
      await syncAlbumCover(tx, album.id)
    })
  } else {
    if (!photoId) {
      return NextResponse.json({ error: { code: 'PHOTO_ID_REQUIRED', message: 'photoId is required for MANUAL mode', retryable: false } }, { status: 400 })
    }

    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        albumId: album.id,
        status: 'READY',
        displayUrl: { not: null },
      },
      select: { id: true, displayUrl: true },
    })

    if (!photo || !photo.displayUrl) {
      return NextResponse.json({ error: { code: 'PHOTO_NOT_ELIGIBLE_FOR_COVER', message: 'Selected photo cannot be used as cover', retryable: false } }, { status: 400 })
    }

    await prisma.album.update({
      where: { id: album.id },
      data: {
        coverMode: 'MANUAL',
        coverPhotoId: photo.id,
        coverPhotoUrl: photo.displayUrl,
      },
    })
  }

  const updated = await prisma.album.findUnique({ where: { id: album.id } })
  return NextResponse.json(updated)
})
