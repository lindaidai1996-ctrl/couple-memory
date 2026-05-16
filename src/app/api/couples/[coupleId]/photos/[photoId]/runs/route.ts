import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withAuth, type AuthContext } from '@/lib/api-middleware'

const TAG = 'api/photo-runs'

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

type PhotoRunsRouteDeps = {
  prismaClient?: typeof prisma
}

export function createPhotoRunsHandler(deps: PhotoRunsRouteDeps = {}) {
  const prismaClient = deps.prismaClient ?? prisma

  return async (_req: Request, { coupleUser }: AuthContext, params: Record<string, string>) => {
    try {
      const photo = await prismaClient.photo.findFirst({
        where: {
          id: params.photoId,
          album: { coupleId: coupleUser.coupleId },
        },
        select: { id: true },
      })
      if (!photo) {
        return createErrorResponse(404, 'PHOTO_NOT_FOUND', 'Photo not found')
      }

      const runs = await prismaClient.pipelineRun.findMany({
        where: {
          coupleId: coupleUser.coupleId,
          photoId: params.photoId,
        },
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          status: true,
          triggerType: true,
          attemptNumber: true,
          summary: true,
          startedAt: true,
          duration: true,
        },
      })

      return NextResponse.json({ runs })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(TAG, '获取照片运行历史失败', { photoId: params.photoId, error: message })
      return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', true)
    }
  }
}

export const photoRunsHandler = createPhotoRunsHandler()
export const GET = withAuth(photoRunsHandler)
