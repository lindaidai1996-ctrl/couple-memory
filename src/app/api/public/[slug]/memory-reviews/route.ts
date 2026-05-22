import { NextResponse } from 'next/server'

import { withPublicAccess } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { splitMemoryReviewsByType, type MemoryReviewRecord } from '@/lib/memory-reviews/review-mappers'

type PublicRouteDeps = {
  prismaClient?: {
    memoryReview: {
      findMany: (args: Record<string, unknown>) => Promise<MemoryReviewRecord[]>
    }
  }
}

async function loadPrismaClient() {
  return prisma as unknown as NonNullable<PublicRouteDeps['prismaClient']>
}

export function createPublicMemoryReviewsHandler(deps: PublicRouteDeps = {}) {
  return async (_req: Request, { couple }: { couple: { id: string } }) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const reviews = await prismaClient.memoryReview.findMany({
      where: {
        coupleId: couple.id,
        status: 'READY',
        publishedAt: { not: null },
      },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    })

    return NextResponse.json(splitMemoryReviewsByType(reviews))
  }
}

export const GET = withPublicAccess(createPublicMemoryReviewsHandler())
