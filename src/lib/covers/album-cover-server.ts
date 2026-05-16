import { Prisma } from '../../../prisma/generated/prisma/client'

import { resolveAlbumCover } from './album-cover'
import { logger } from '@/lib/logger'

const TAG = 'covers/album-sync'

function isMissingAlbumCoverMetadata(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2022'
  )
}

export async function syncAlbumCover(
  tx: Prisma.TransactionClient,
  albumId: string
) {
  try {
    const album = await tx.album.findUnique({
      where: { id: albumId },
      select: {
        id: true,
        coverMode: true,
        coverPhotoId: true,
        photos: {
          select: {
            id: true,
            status: true,
            displayUrl: true,
            sortOrder: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })

    if (!album) return null

    const resolvedCover = resolveAlbumCover({
      coverMode: album.coverMode,
      coverPhotoId: album.coverPhotoId,
      photos: album.photos,
    })

    const nextMode =
      album.coverMode === 'MANUAL' && album.coverPhotoId && resolvedCover?.photoId !== album.coverPhotoId
        ? 'AUTO'
        : album.coverMode

    return await tx.album.update({
      where: { id: albumId },
      data: {
        coverMode: nextMode,
        coverPhotoId: nextMode === 'AUTO' ? null : resolvedCover?.photoId ?? album.coverPhotoId,
        coverPhotoUrl: resolvedCover?.coverUrl ?? null,
      },
    })
  } catch (error) {
    if (isMissingAlbumCoverMetadata(error)) {
      logger.warn(TAG, 'Album cover metadata columns unavailable; skipping cover sync', {
        albumId,
      })
      return null
    }

    throw error
  }
}
