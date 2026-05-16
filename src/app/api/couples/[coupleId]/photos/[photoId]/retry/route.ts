import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withAuth, type AuthContext } from '@/lib/api-middleware'
import { extractOssKeyFromOriginalUrl, processPhoto } from '@/lib/pipeline/process-photo'
import { buildRetryGuard } from '@/lib/pipeline/run-status'

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
        },
        include: {
          pipelineRuns: {
            orderBy: { startedAt: 'desc' },
            take: 1,
            select: { status: true },
          },
        },
      })
      if (!photo) {
        return createErrorResponse(404, 'PHOTO_NOT_FOUND', 'Photo not found')
      }

      const guard = buildRetryGuard({
        photoStatus: photo.status,
        latestRunStatus: photo.pipelineRuns?.[0]?.status ?? null,
      })
      if (!guard.allowed) {
        return createErrorResponse(409, guard.code, 'Pipeline is already running for this photo')
      }

      if (photo.status !== 'FAILED') {
        return createErrorResponse(409, 'PHOTO_RETRY_NOT_ALLOWED', 'Photo is not eligible for retry')
      }

      const ossKey = extractOssKeyFromOriginalUrl(photo.originalUrl)
      if (!ossKey) {
        return createErrorResponse(409, 'PHOTO_SOURCE_INVALID', 'Photo source is invalid')
      }

      const claimed = await prismaClient.photo.updateMany({
        where: { id: params.photoId, status: 'FAILED' },
        data: { status: 'PROCESSING', processingError: null },
      })
      if (claimed.count !== 1) {
        return createErrorResponse(409, 'PIPELINE_ALREADY_RUNNING', 'Pipeline is already running for this photo')
      }

      void processPhotoImpl(params.photoId, ossKey, undefined, 'RETRY').catch((error: unknown) => {
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
