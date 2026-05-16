import { NextResponse } from 'next/server'

import { withAuth } from '@/lib/api-middleware'
import { createApiErrorResponse, createRequestId, logApiError } from '@/lib/api-error'
import { syncAlbumCover } from '@/lib/covers/album-cover-server'
import { prisma } from '@/lib/prisma'

const TAG = 'albums/cover'

export const PATCH = withAuth(async (req, { coupleUser }, params) => {
  const requestId = createRequestId()

  try {
    const { mode, photoId } = await req.json() as { mode?: 'AUTO' | 'MANUAL'; photoId?: string }

    const album = await prisma.album.findFirst({
      where: { id: params.albumId, coupleId: coupleUser.coupleId },
      select: { id: true },
    })

    if (!album) {
      return createApiErrorResponse(404, 'ALBUM_NOT_FOUND', 'Album not found', false, requestId)
    }

    if (mode !== 'AUTO' && mode !== 'MANUAL') {
      return createApiErrorResponse(400, 'INVALID_COVER_MODE', 'mode must be AUTO or MANUAL', false, requestId)
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
        return createApiErrorResponse(400, 'PHOTO_ID_REQUIRED', 'photoId is required for MANUAL mode', false, requestId)
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
        return createApiErrorResponse(400, 'PHOTO_NOT_ELIGIBLE_FOR_COVER', 'Selected photo cannot be used as cover', false, requestId)
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logApiError(TAG, '设置相册封面失败', {
      requestId,
      coupleId: coupleUser.coupleId,
      albumId: params.albumId,
      error: message,
    })

    return createApiErrorResponse(500, 'SET_COVER_FAILED', 'Failed to update album cover', true, requestId)
  }
})
