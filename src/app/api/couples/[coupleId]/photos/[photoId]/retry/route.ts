import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withAuth, type AuthContext } from '@/lib/api-middleware'
import { extractOssKeyFromOriginalUrl, processPhoto } from '@/lib/pipeline/process-photo'

const TAG = 'api/photo-retry'

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

type RetryPhotoRouteDeps = {
  prismaClient?: typeof prisma
  processPhotoImpl?: typeof processPhoto
}

export function createRetryPhotoHandler(deps: RetryPhotoRouteDeps = {}) {
  const prismaClient = deps.prismaClient ?? prisma
  const processPhotoImpl = deps.processPhotoImpl ?? processPhoto

  return async (_req: Request, { coupleUser }: AuthContext, params: Record<string, string>) => {
    try {
      const photo = await prismaClient.photo.findFirst({
        where: {
          id: params.photoId,
          album: { coupleId: coupleUser.coupleId },
          status: 'FAILED',
        },
      })
      if (!photo) {
        return createErrorResponse(404, 'PHOTO_NOT_FOUND', 'Photo not found')
      }

      const ossKey = extractOssKeyFromOriginalUrl(photo.originalUrl)
      if (!ossKey) {
        return createErrorResponse(409, 'PHOTO_SOURCE_INVALID', 'Photo source is invalid')
      }

      await prismaClient.photo.update({
        where: { id: params.photoId },
        data: { status: 'PROCESSING', processingError: null },
      })

      void processPhotoImpl(params.photoId, ossKey).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown error'
        logger.error(TAG, '重试处理启动失败', { photoId: params.photoId, error: message })
      })

      return NextResponse.json({
        photoId: params.photoId,
        status: 'PROCESSING',
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(TAG, '重试请求失败', { photoId: params.photoId, error: message })
      return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', true)
    }
  }
}

export const retryPhotoHandler = createRetryPhotoHandler()
export const POST = withAuth(retryPhotoHandler)
