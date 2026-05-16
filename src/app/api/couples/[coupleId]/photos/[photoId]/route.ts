import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { withAuth, type AuthContext } from '@/lib/api-middleware'
import { syncAlbumCover } from '@/lib/covers/album-cover-server'

const TAG = 'api/photo-detail'

function createErrorResponse(
  status: number,
  code: string,
  message: string,
  retryable = false
) {
  return NextResponse.json(
    { error: { code, message, retryable } },
    { status }
  )
}

type PhotoRouteDeps = {
  prismaClient?: {
    photo: {
      findFirst: (
        args: Record<string, unknown>
      ) => Promise<
        | {
            id: string
            albumId: string
            status: string
            processingError?: string | null
            fileName?: string
            originalUrl?: string
            thumbnailUrl?: string | null
            pipelineRuns: Array<{
              id: string
              status: string
              triggerType: string | null
              attemptNumber: number
              summary: string | null
              startedAt: unknown
              completedAt?: unknown
              duration: number | null
              totalTokens?: number | null
              totalCost?: number | null
              errorCode?: string | null
            }>
            [key: string]: unknown
          }
        | null
      >
      update?: (args: Record<string, unknown>) => Promise<unknown>
      delete?: (args: Record<string, unknown>) => Promise<unknown>
      findMany?: (args: Record<string, unknown>) => Promise<Array<{ id: string; sortOrder: number }>>
    }
    $transaction?: <T>(
      callback: (tx: {
        photo: {
          delete: (args: Record<string, unknown>) => Promise<unknown>
          findMany: (args: Record<string, unknown>) => Promise<Array<{ id: string; sortOrder: number }>>
          update: (args: Record<string, unknown>) => Promise<unknown>
        }
        album: {
          findUnique: (args: Record<string, unknown>) => Promise<unknown>
          update: (args: Record<string, unknown>) => Promise<unknown>
        }
      }) => Promise<T>
    ) => Promise<T>
  }
}

async function loadPrismaClient() {
  const { prisma } = await import('@/lib/prisma')
  return prisma as unknown as NonNullable<PhotoRouteDeps['prismaClient']>
}

export function createGetPhotoHandler(deps: PhotoRouteDeps = {}) {
  return async (_req: Request, { coupleUser }: AuthContext, params: Record<string, string>) => {
    try {
      const prismaClient = deps.prismaClient ?? await loadPrismaClient()
      const photo = await prismaClient.photo.findFirst({
        where: { id: params.photoId, album: { coupleId: coupleUser.coupleId } },
        include: {
          pipelineRuns: {
            orderBy: { startedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              triggerType: true,
              attemptNumber: true,
              summary: true,
              startedAt: true,
              completedAt: true,
              duration: true,
              totalTokens: true,
              totalCost: true,
              errorCode: true,
            },
          },
        },
      })
      if (!photo) {
        return createErrorResponse(404, 'PHOTO_NOT_FOUND', 'Photo not found')
      }

      const { pipelineRuns, ...photoData } = photo
      const [latestRun] = pipelineRuns

      return NextResponse.json({
        ...photoData,
        latestRun: latestRun ?? null,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(TAG, '获取单图详情失败', { photoId: params.photoId, error: message })
      return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', true)
    }
  }
}

export const getPhotoHandler = createGetPhotoHandler()
export const GET = withAuth(getPhotoHandler)

export const PATCH = withAuth(async (req, { coupleUser }, params) => {
  const prismaClient = await loadPrismaClient()
  const body = await req.json()
  const photo = await prismaClient.photo.findFirst({
    where: { id: params.photoId, album: { coupleId: coupleUser.coupleId } },
  })
  if (!photo) {
    return createErrorResponse(404, 'PHOTO_NOT_FOUND', 'Photo not found')
  }

  const updated = await prismaClient.photo.update!({
    where: { id: params.photoId },
    data: body,
  })
  return NextResponse.json(updated)
})

export const DELETE = withAuth(async (req, { coupleUser }, params) => {
  const prismaClient = await loadPrismaClient()
  const photo = await prismaClient.photo.findFirst({
    where: { id: params.photoId, album: { coupleId: coupleUser.coupleId } },
    select: { id: true, albumId: true },
  })
  if (!photo) {
    return createErrorResponse(404, 'PHOTO_NOT_FOUND', 'Photo not found')
  }

  await prismaClient.$transaction!(async tx => {
    await tx.photo.delete({ where: { id: params.photoId } })

    const remainingPhotos = await tx.photo.findMany({
      where: { albumId: photo.albumId },
      select: { id: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    await Promise.all(
      remainingPhotos.map((item, index) =>
        tx.photo.update({
          where: { id: item.id },
          data: { sortOrder: index + 1 },
        })
      )
    )

    await syncAlbumCover(tx, photo.albumId)
  })

  return new Response(null, { status: 204 })
})
