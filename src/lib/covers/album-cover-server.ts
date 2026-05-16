import { resolveAlbumCover } from './album-cover'
import { logger } from '@/lib/logger'

const TAG = 'covers/album-sync'

type AlbumCoverRecord = {
  id: string
  coverMode: 'AUTO' | 'MANUAL'
  coverPhotoId: string | null
  photos: Array<{
    id: string
    status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'
    displayUrl: string | null
    sortOrder: number
  }>
}

type AlbumCoverDelegate = {
  findUnique: (args: Record<string, unknown>) => Promise<AlbumCoverRecord | null>
  update: (args: Record<string, unknown>) => Promise<unknown>
}

type AlbumCoverTransaction = {
  album: object
}

function isMissingAlbumCoverMetadata(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2022'
  )
}

export async function syncAlbumCover(
  tx: AlbumCoverTransaction,
  albumId: string
) {
  try {
    const albumDelegate = tx.album as unknown as AlbumCoverDelegate
    const album = await albumDelegate.findUnique({
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

    return await albumDelegate.update({
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
