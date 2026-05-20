import { NextResponse } from 'next/server'

import { withAuth } from '@/lib/api-middleware'
import { createApiErrorResponse, createRequestId, logApiError } from '@/lib/api-error'
import { syncAlbumCover } from '@/lib/covers/album-cover-server'
import { reindexPhotoSortOrders } from '@/lib/photos/sort-order'
import type { AuthContext } from '@/lib/api-middleware'

type BatchAction = 'DELETE' | 'MOVE'
const TAG = 'photos/batch'

type BatchPhotoRouteDeps = {
  prismaClient?: {
    photo: {
      findMany: (args: Record<string, unknown>) => Promise<Array<{ id: string; albumId: string }>>
      deleteMany?: (args: Record<string, unknown>) => Promise<unknown>
      update?: (args: Record<string, unknown>) => Promise<unknown>
    }
    album: {
      findFirst: (args: Record<string, unknown>) => Promise<{ id: string } | null>
    }
    photoAIVariant?: {
      deleteMany: (args: Record<string, unknown>) => Promise<unknown>
    }
    pipelineRun?: {
      deleteMany: (args: Record<string, unknown>) => Promise<unknown>
    }
    $transaction: <T>(
      callback: (tx: {
        photoAIVariant: {
          deleteMany: (args: Record<string, unknown>) => Promise<unknown>
        }
        pipelineRun: {
          deleteMany: (args: Record<string, unknown>) => Promise<unknown>
        }
        photo: {
          deleteMany: (args: Record<string, unknown>) => Promise<unknown>
          findMany: (args: Record<string, unknown>) => Promise<Array<{ id: string; sortOrder: number }>>
          update: (args: Record<string, unknown>) => Promise<unknown>
        }
        album: {
          update: (args: Record<string, unknown>) => Promise<unknown>
          findUnique: (args: Record<string, unknown>) => Promise<unknown>
        }
      }) => Promise<T>
    ) => Promise<T>
  }
}

async function loadPrismaClient() {
  const { prisma } = await import('@/lib/prisma')
  return prisma as unknown as NonNullable<BatchPhotoRouteDeps['prismaClient']>
}

export function createBatchPhotoHandler(deps: BatchPhotoRouteDeps = {}) {
  return async (req: Request, { coupleUser }: AuthContext) => {
    const requestId = createRequestId()

    try {
      const { action, photoIds, targetAlbumId } = await req.json() as {
        action?: BatchAction
        photoIds?: string[]
        targetAlbumId?: string
      }

      if (!action || !Array.isArray(photoIds) || photoIds.length === 0) {
        return createApiErrorResponse(400, 'INVALID_BATCH_REQUEST', 'action and photoIds are required', false, requestId)
      }

      if (action === 'MOVE' && !targetAlbumId) {
        return createApiErrorResponse(400, 'TARGET_ALBUM_REQUIRED', 'targetAlbumId is required', false, requestId)
      }

      const prismaClient = deps.prismaClient ?? await loadPrismaClient()

      const photos = await prismaClient.photo.findMany({
        where: {
          id: { in: photoIds },
          album: { coupleId: coupleUser.coupleId },
        },
        select: { id: true, albumId: true },
      })

      if (photos.length !== photoIds.length) {
        return createApiErrorResponse(404, 'PHOTO_NOT_FOUND', 'One or more photos were not found', false, requestId)
      }

      if (action === 'DELETE') {
        const sourceAlbumIds = [...new Set(photos.map(photo => photo.albumId))]

        await prismaClient.$transaction(async tx => {
          await tx.photoAIVariant.deleteMany({ where: { photoId: { in: photoIds } } })
          await tx.pipelineRun.deleteMany({ where: { photoId: { in: photoIds } } })
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

      const targetAlbum = await prismaClient.album.findFirst({
        where: { id: targetAlbumId, coupleId: coupleUser.coupleId },
        select: { id: true },
      })

      if (!targetAlbum) {
        return createApiErrorResponse(404, 'TARGET_ALBUM_NOT_FOUND', 'Target album not found', false, requestId)
      }

      const sourceAlbumIds = [...new Set(photos.map(photo => photo.albumId))]
      if (sourceAlbumIds.length !== 1) {
        return createApiErrorResponse(400, 'MULTI_ALBUM_BATCH_UNSUPPORTED', 'Batch move only supports photos from one album', false, requestId)
      }

      const sourceAlbumId = sourceAlbumIds[0]
      if (sourceAlbumId === targetAlbum.id) {
        return createApiErrorResponse(400, 'TARGET_ALBUM_SAME_AS_SOURCE', 'Target album must be different from source album', false, requestId)
      }

      await prismaClient.$transaction(async tx => {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logApiError(TAG, '批量操作照片失败', {
        requestId,
        coupleId: coupleUser.coupleId,
        error: message,
      })
      return createApiErrorResponse(500, 'BATCH_PHOTO_ACTION_FAILED', 'Failed to process batch photo action', true, requestId)
    }
  }
}

export const batchPhotoHandler = createBatchPhotoHandler()
export const POST = withAuth(batchPhotoHandler)
