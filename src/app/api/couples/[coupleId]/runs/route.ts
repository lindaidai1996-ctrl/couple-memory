import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withAuth, type AuthContext } from '@/lib/api-middleware'

const TAG = 'api/couple-runs'

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

type CoupleRunsRouteDeps = {
  prismaClient?: typeof prisma
}

export function createCoupleRunsHandler(deps: CoupleRunsRouteDeps = {}) {
  const prismaClient = deps.prismaClient ?? prisma

  return async (req: Request, { coupleUser }: AuthContext) => {
    try {
      const url = new URL(req.url)
      const status = url.searchParams.get('status')
      const photoId = url.searchParams.get('photoId')
      const albumId = url.searchParams.get('albumId')
      const triggerType = url.searchParams.get('triggerType')
      const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1)
      const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10), 1), 100)

      const where = {
        coupleId: coupleUser.coupleId,
        ...(status ? { status: status as never } : {}),
        ...(photoId ? { photoId } : {}),
        ...(triggerType ? { triggerType } : {}),
        ...(albumId ? { photo: { albumId } } : {}),
      }

      const [runs, total] = await Promise.all([
        prismaClient.pipelineRun.findMany({
          where,
          orderBy: { startedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            status: true,
            triggerType: true,
            attemptNumber: true,
            summary: true,
            startedAt: true,
            duration: true,
            photo: {
              select: {
                id: true,
                albumId: true,
                fileName: true,
                thumbnailUrl: true,
                album: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        }),
        prismaClient.pipelineRun.count({ where }),
      ])

      return NextResponse.json({ runs, total, page, limit })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(TAG, '获取空间运行历史失败', { coupleId: coupleUser.coupleId, error: message })
      return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', true)
    }
  }
}

export const coupleRunsHandler = createCoupleRunsHandler()
export const GET = withAuth(coupleRunsHandler)
