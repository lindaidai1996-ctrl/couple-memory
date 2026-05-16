import { NextResponse } from 'next/server'
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
  prismaClient?: {
    photo: {
      findFirst: (args: Record<string, unknown>) => Promise<{
        id: string
        originalUrl: string
        status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'
        pipelineRuns?: Array<{ status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEGRADED' }>
      } | null>
      updateMany: (args: Record<string, unknown>) => Promise<{ count: number }>
    }
  }
  processPhotoImpl?: typeof processPhoto
}

type RetryScope = 'FULL' | 'CAPTION_ONLY'

function resolveRetryTriggerType(scope: RetryScope) {
  return scope === 'CAPTION_ONLY' ? 'CAPTION_REGEN' as const : 'MANUAL_RETRY' as const
}

async function loadPrismaClient() {
  const { prisma } = await import('@/lib/prisma')
  return prisma as unknown as NonNullable<RetryPhotoRouteDeps['prismaClient']>
}

export function createRetryPhotoHandler(deps: RetryPhotoRouteDeps = {}) {
  const processPhotoImpl = deps.processPhotoImpl ?? processPhoto

  return async (_req: Request, { coupleUser }: AuthContext, params: Record<string, string>) => {
    try {
      const body = await _req.json().catch(() => ({}))
      const scope = body?.scope
      if (scope !== 'FULL' && scope !== 'CAPTION_ONLY') {
        return createErrorResponse(400, 'INVALID_RETRY_SCOPE', 'scope must be FULL or CAPTION_ONLY')
      }

      const prismaClient = deps.prismaClient ?? await loadPrismaClient()
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

      const latestRunStatus = photo.pipelineRuns?.[0]?.status ?? null
      const canRetryFailedPhoto = photo.status === 'FAILED'
      const canRegenerateCaption =
        scope === 'CAPTION_ONLY' && latestRunStatus === 'DEGRADED'

      if (!canRetryFailedPhoto && !canRegenerateCaption) {
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

      const triggerType = resolveRetryTriggerType(scope)
      const result = await processPhotoImpl(params.photoId, ossKey, undefined, triggerType)

      return NextResponse.json({
        photoId: params.photoId,
        runId: result?.runId ?? null,
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
