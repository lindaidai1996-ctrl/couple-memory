import { NextResponse } from 'next/server'

import { withAuth, type AuthContext } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { mapMemoryReview, type MemoryReviewRecord } from '@/lib/memory-reviews/review-mappers'

type ListRouteDeps = {
  prismaClient?: {
    memoryReview: {
      findMany: (args: Record<string, unknown>) => Promise<MemoryReviewRecord[]>
    }
  }
}

async function loadPrismaClient() {
  return prisma as unknown as NonNullable<ListRouteDeps['prismaClient']>
}

export function createListMemoryReviewsHandler(deps: ListRouteDeps = {}) {
  return async (_req: Request, { coupleUser }: AuthContext) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const reviews = await prismaClient.memoryReview.findMany({
      where: { coupleId: coupleUser.coupleId },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    })

    return NextResponse.json({
      reviews: reviews.map(mapMemoryReview),
    })
  }
}

export const GET = withAuth(createListMemoryReviewsHandler())
