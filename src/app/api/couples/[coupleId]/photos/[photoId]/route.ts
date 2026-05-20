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
          aiVariants?: Array<{
            id: string
            type: string
            content: string
            style?: string | null
            reason?: string | null
            isSelected?: boolean
          }>
            [key: string]: unknown
          }
        | null
      >
      update?: (args: Record<string, unknown>) => Promise<unknown>
      delete?: (args: Record<string, unknown>) => Promise<unknown>
      findMany?: (args: Record<string, unknown>) => Promise<Array<{ id: string; sortOrder: number }>>
    }
    photoAIVariant?: {
      findFirst?: (args: Record<string, unknown>) => Promise<{
        id: string
        photoId: string
        type: string
        content: string
      } | null>
      deleteMany?: (args: Record<string, unknown>) => Promise<unknown>
      updateMany?: (args: Record<string, unknown>) => Promise<unknown>
      update?: (args: Record<string, unknown>) => Promise<unknown>
    }
    pipelineRun?: {
      deleteMany?: (args: Record<string, unknown>) => Promise<unknown>
    }
    $transaction?: <T>(
      callback: (tx: {
        photo: {
          delete: (args: Record<string, unknown>) => Promise<unknown>
          findMany: (args: Record<string, unknown>) => Promise<Array<{ id: string; sortOrder: number }>>
          update: (args: Record<string, unknown>) => Promise<unknown>
        }
        pipelineRun: {
          deleteMany: (args: Record<string, unknown>) => Promise<unknown>
        }
        photoAIVariant: {
          findFirst: (args: Record<string, unknown>) => Promise<{
            id: string
            photoId: string
            type: string
            content: string
          } | null>
          deleteMany: (args: Record<string, unknown>) => Promise<unknown>
          updateMany: (args: Record<string, unknown>) => Promise<unknown>
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
          aiVariants: {
            orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
            select: {
              id: true,
              type: true,
              content: true,
              style: true,
              reason: true,
              isSelected: true,
            },
          },
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

      const { aiVariants = [], pipelineRuns, ...photoData } = photo
      const [latestRun] = pipelineRuns

      return NextResponse.json({
        ...photoData,
        latestRun: latestRun ?? null,
        captionVariants: aiVariants.filter(item => item.type === 'CAPTION'),
        layoutVariants: aiVariants.filter(item => item.type === 'LAYOUT'),
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

type PhotoPatchBody = {
  userCaption?: unknown
  aiLayout?: unknown
  selectedCaptionVariantId?: unknown
  selectedLayoutVariantId?: unknown
}

function buildPhotoUpdateData(body: PhotoPatchBody) {
  const data: Record<string, unknown> = {}

  if (typeof body.userCaption === 'string') {
    data.userCaption = body.userCaption
    data.selectedCaptionSource = body.userCaption.trim() ? 'MANUAL' : 'AI'
  }

  if (typeof body.aiLayout === 'string') {
    data.aiLayout = body.aiLayout
    data.selectedLayoutSource = 'MANUAL'
  }

  return data
}

async function updateSelectedVariant(
  tx: NonNullable<NonNullable<PhotoRouteDeps['prismaClient']>['$transaction']> extends (
    callback: (tx: infer T) => Promise<unknown>
  ) => Promise<unknown> ? T : never,
  photoId: string,
  variantId: string,
  variantType: 'CAPTION' | 'LAYOUT'
) {
  const variant = await tx.photoAIVariant.findFirst({
    where: {
      id: variantId,
      photoId,
      type: variantType,
    },
  })

  if (!variant) {
    return null
  }

  await tx.photoAIVariant.updateMany({
    where: {
      photoId,
      type: variantType,
    },
    data: {
      isSelected: false,
    },
  })

  await tx.photoAIVariant.update({
    where: { id: variantId },
    data: { isSelected: true },
  })

  const data = variantType === 'CAPTION'
    ? {
        aiCaption: variant.content,
        selectedCaptionSource: 'AI',
      }
    : {
        aiLayout: variant.content,
        selectedLayoutSource: 'AI',
      }

  return tx.photo.update({
    where: { id: photoId },
    data,
  })
}

export function createPatchPhotoHandler(deps: PhotoRouteDeps = {}) {
  return async (req: Request, { coupleUser }: AuthContext, params: Record<string, string>) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const body = await req.json() as PhotoPatchBody
    const photo = await prismaClient.photo.findFirst({
      where: { id: params.photoId, album: { coupleId: coupleUser.coupleId } },
      select: { id: true, albumId: true },
    })
    if (!photo) {
      return createErrorResponse(404, 'PHOTO_NOT_FOUND', 'Photo not found')
    }

    const data = buildPhotoUpdateData(body)
    const hasCaptionVariantSelection = typeof body.selectedCaptionVariantId === 'string'
    const hasLayoutVariantSelection = typeof body.selectedLayoutVariantId === 'string'

    if (hasCaptionVariantSelection || hasLayoutVariantSelection) {
      const updated = await prismaClient.$transaction!(async tx => {
        let current = Object.keys(data).length > 0
          ? await tx.photo.update({
              where: { id: params.photoId },
              data,
            })
          : null

        if (hasCaptionVariantSelection) {
          current = await updateSelectedVariant(tx, params.photoId, body.selectedCaptionVariantId as string, 'CAPTION')
          if (!current) {
            throw new Error('CAPTION_VARIANT_NOT_FOUND')
          }
        }

        if (hasLayoutVariantSelection) {
          current = await updateSelectedVariant(tx, params.photoId, body.selectedLayoutVariantId as string, 'LAYOUT')
          if (!current) {
            throw new Error('LAYOUT_VARIANT_NOT_FOUND')
          }
        }

        return current
      }).catch(error => {
        if (error instanceof Error && error.message === 'CAPTION_VARIANT_NOT_FOUND') {
          return 'CAPTION_VARIANT_NOT_FOUND' as const
        }
        if (error instanceof Error && error.message === 'LAYOUT_VARIANT_NOT_FOUND') {
          return 'LAYOUT_VARIANT_NOT_FOUND' as const
        }
        throw error
      })

      if (updated === 'CAPTION_VARIANT_NOT_FOUND') {
        return createErrorResponse(404, 'CAPTION_VARIANT_NOT_FOUND', 'Caption variant not found')
      }
      if (updated === 'LAYOUT_VARIANT_NOT_FOUND') {
        return createErrorResponse(404, 'LAYOUT_VARIANT_NOT_FOUND', 'Layout variant not found')
      }

      return NextResponse.json(updated)
    }

    const updated = await prismaClient.photo.update!({
      where: { id: params.photoId },
      data,
    })
    return NextResponse.json(updated)
  }
}

export const PATCH = withAuth(createPatchPhotoHandler())

export function createDeletePhotoHandler(deps: PhotoRouteDeps = {}) {
  return async (_req: Request, { coupleUser }: AuthContext, params: Record<string, string>) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const photo = await prismaClient.photo.findFirst({
      where: { id: params.photoId, album: { coupleId: coupleUser.coupleId } },
      select: { id: true, albumId: true },
    })
    if (!photo) {
      return createErrorResponse(404, 'PHOTO_NOT_FOUND', 'Photo not found')
    }

    await prismaClient.$transaction!(async tx => {
      await tx.photoAIVariant.deleteMany({ where: { photoId: params.photoId } })
      await tx.pipelineRun.deleteMany({ where: { photoId: params.photoId } })
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
  }
}

export const DELETE = withAuth(createDeletePhotoHandler())
