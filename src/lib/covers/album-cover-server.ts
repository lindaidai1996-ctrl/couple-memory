import type { Prisma } from '../../../prisma/generated/prisma/client'

import { resolveAlbumCover } from './album-cover'

export async function syncAlbumCover(
  tx: Prisma.TransactionClient,
  albumId: string
) {
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

  return tx.album.update({
    where: { id: albumId },
    data: {
      coverMode: nextMode,
      coverPhotoId: nextMode === 'AUTO' ? null : resolvedCover?.photoId ?? album.coverPhotoId,
      coverPhotoUrl: resolvedCover?.coverUrl ?? null,
    },
  })
}
