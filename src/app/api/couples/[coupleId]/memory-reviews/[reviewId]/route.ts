import { NextResponse } from 'next/server'

import { withAuth, type AuthContext } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { mapMemoryReview, type MemoryReviewRecord } from '@/lib/memory-reviews/review-mappers'

type DetailRouteDeps = {
  prismaClient?: {
    memoryReview: {
      findFirst: (args: Record<string, unknown>) => Promise<MemoryReviewRecord | null>
    }
  }
}

async function loadPrismaClient() {
  return prisma as unknown as NonNullable<DetailRouteDeps['prismaClient']>
}

export function createGetMemoryReviewDetailHandler(deps: DetailRouteDeps = {}) {
  return async (
    _req: Request,
    { coupleUser }: AuthContext,
    params: Record<string, string>
  ) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const review = await prismaClient.memoryReview.findFirst({
      where: { id: params.reviewId, coupleId: coupleUser.coupleId },
    })

    if (!review) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ review: mapMemoryReview(review) })
  }
}

export const GET = withAuth(createGetMemoryReviewDetailHandler())
