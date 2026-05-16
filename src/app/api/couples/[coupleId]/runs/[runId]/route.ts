import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withAuth, type AuthContext } from '@/lib/api-middleware'

const TAG = 'api/run-detail'

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

type RunDetailRouteDeps = {
  prismaClient?: typeof prisma
}

export function createRunDetailHandler(deps: RunDetailRouteDeps = {}) {
  const prismaClient = deps.prismaClient ?? prisma

  return async (_req: Request, { coupleUser }: AuthContext, params: Record<string, string>) => {
    try {
      const run = await prismaClient.pipelineRun.findFirst({
        where: {
          id: params.runId,
          coupleId: coupleUser.coupleId,
        },
        select: {
          id: true,
          status: true,
          triggerType: true,
          attemptNumber: true,
          summary: true,
          errorCode: true,
          totalTokens: true,
          totalCost: true,
          duration: true,
          nodeResults: true,
          photo: {
            select: {
              id: true,
              status: true,
              processingError: true,
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
      })
      if (!run) {
        return createErrorResponse(404, 'RUN_NOT_FOUND', 'Run not found')
      }

      return NextResponse.json(run)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(TAG, '获取运行详情失败', { runId: params.runId, error: message })
      return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', true)
    }
  }
}

export const runDetailHandler = createRunDetailHandler()
export const GET = withAuth(runDetailHandler)
