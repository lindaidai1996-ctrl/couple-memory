import { prisma } from '@/lib/prisma'
import {
  mapMemoryReview,
  splitMemoryReviewsByType,
  type MemoryReviewListItem,
  type MemoryReviewRecord,
} from './review-mappers'

type ReviewQueryClient = {
  memoryReview: {
    findMany: (args: Record<string, unknown>) => Promise<MemoryReviewRecord[]>
    findFirst: (args: Record<string, unknown>) => Promise<MemoryReviewRecord | null>
  }
}

function getClient(client?: ReviewQueryClient) {
  return (client ?? (prisma as unknown as ReviewQueryClient))
}

export async function getDashboardMemoryReviewsByCoupleId(
  coupleId: string,
  client?: ReviewQueryClient
) {
  const prismaClient = getClient(client)
  const reviews = await prismaClient.memoryReview.findMany({
    where: { coupleId },
    orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
  })

  return reviews.map(mapMemoryReview)
}

export async function getMemoryReviewById(
  coupleId: string,
  reviewId: string,
  client?: ReviewQueryClient
) {
  const prismaClient = getClient(client)
  const review = await prismaClient.memoryReview.findFirst({
    where: { id: reviewId, coupleId },
  })

  return review ? mapMemoryReview(review) : null
}

export async function getPublicMemoryReviewsByCoupleId(
  coupleId: string,
  client?: ReviewQueryClient
) {
  const prismaClient = getClient(client)
  const reviews = await prismaClient.memoryReview.findMany({
    where: {
      coupleId,
      status: 'READY',
      publishedAt: { not: null },
    },
    orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
  })

  return splitMemoryReviewsByType(reviews)
}

export function buildDashboardReviewCard(reviews: MemoryReviewListItem[]) {
  const yearlyReview = reviews.find(review => review.type === 'YEARLY') ?? null
  const anniversaryReview =
    reviews.find(review => review.type === 'ANNIVERSARY') ?? null

  return {
    hasYearlyReview: Boolean(yearlyReview),
    hasAnniversaryReview: Boolean(anniversaryReview),
    yearlyReview,
    anniversaryReview,
    reviewCount: reviews.length,
  }
}
