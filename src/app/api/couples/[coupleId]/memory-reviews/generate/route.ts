import { NextResponse } from 'next/server'

import { withAuth, type AuthContext } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import {
  buildAnniversaryRange,
  buildMemoryReview,
  buildYearlyRange,
  filterMilestonesByRange,
} from '@/lib/memory-reviews/review-builder'

type GenerateBody = {
  type?: 'YEARLY' | 'ANNIVERSARY'
  year?: number
  anniversaryYear?: number
}

type GenerateRouteDeps = {
  prismaClient?: {
    memoryReview: {
      deleteMany: (args: Record<string, unknown>) => Promise<unknown>
      create: (args: Record<string, unknown>) => Promise<unknown>
    }
    couple: {
      findUnique: (args: Record<string, unknown>) => Promise<{
        id: string
        name: string
        startDate: Date | null
        albums: Array<{
          id: string
          title: string
          description: string | null
          coverPhotoUrl: string | null
          chapters: Array<{
            id: string
            title: string
            aiSummary: string | null
          }>
        }>
        milestones: Array<{
          id: string
          title: string
          description: string | null
          date: Date
          locationName: string | null
          photo: {
            displayUrl: string | null
            thumbnailUrl: string | null
          } | null
        }>
      } | null>
    }
  }
}

function resolveDefaultAnniversaryYear(startDate: Date, now = new Date()) {
  const yearDiff = now.getUTCFullYear() - startDate.getUTCFullYear()
  const anniversary = new Date(startDate)
  anniversary.setUTCFullYear(startDate.getUTCFullYear() + yearDiff)

  if (now.getTime() < anniversary.getTime()) {
    return Math.max(yearDiff, 0)
  }

  return yearDiff + 1
}

function buildReviewScopeKey(type: 'YEARLY' | 'ANNIVERSARY', value: number) {
  return `${type}:${value}`
}

async function loadPrismaClient() {
  return prisma as unknown as NonNullable<GenerateRouteDeps['prismaClient']>
}

export function createGenerateMemoryReviewHandler(deps: GenerateRouteDeps = {}) {
  return async (
    req: Request,
    { coupleUser }: AuthContext
  ) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const body = await req.json().catch(() => ({})) as GenerateBody
    const type = body.type === 'ANNIVERSARY' ? 'ANNIVERSARY' : 'YEARLY'

    const couple = await prismaClient.couple.findUnique({
      where: { id: coupleUser.coupleId },
      select: {
        id: true,
        name: true,
        startDate: true,
        albums: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            title: true,
            description: true,
            coverPhotoUrl: true,
            chapters: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
              select: {
                id: true,
                title: true,
                aiSummary: true,
              },
            },
          },
        },
        milestones: {
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            title: true,
            description: true,
            date: true,
            locationName: true,
            photo: {
              select: {
                displayUrl: true,
                thumbnailUrl: true,
              },
            },
          },
        },
      },
    })

    if (!couple) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const year = type === 'YEARLY'
      ? (typeof body.year === 'number' ? body.year : new Date().getUTCFullYear())
      : undefined
    const anniversaryYear = type === 'ANNIVERSARY'
      ? (typeof body.anniversaryYear === 'number'
          ? body.anniversaryYear
          : (couple.startDate ? resolveDefaultAnniversaryYear(couple.startDate) : undefined))
      : undefined

    if (type === 'ANNIVERSARY' && !couple.startDate) {
      return NextResponse.json(
        { error: 'Couple start date is required for anniversary review' },
        { status: 422 }
      )
    }

    if (type === 'ANNIVERSARY' && (!anniversaryYear || anniversaryYear < 1)) {
      return NextResponse.json(
        { error: 'Invalid anniversary year' },
        { status: 422 }
      )
    }

    const range = type === 'YEARLY'
      ? buildYearlyRange(year!)
      : buildAnniversaryRange(couple.startDate!, anniversaryYear!)

    const milestones = filterMilestonesByRange(couple.milestones, range)
    const chapters = couple.albums.flatMap(album =>
      album.chapters.map(chapter => ({
        id: chapter.id,
        title: chapter.title,
        aiSummary: chapter.aiSummary,
        albumId: album.id,
      }))
    )

    let review
    try {
      review = buildMemoryReview({
        type,
        coupleName: couple.name,
        year,
        anniversaryYear,
        startDate: couple.startDate,
        milestones,
        chapters,
        albums: couple.albums.map(album => ({
          id: album.id,
          title: album.title,
          description: album.description,
          coverPhotoUrl: album.coverPhotoUrl,
        })),
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_ENOUGH_REVIEW_CONTENT') {
        return NextResponse.json(
          { error: 'Not enough content to build review' },
          { status: 422 }
        )
      }
      throw error
    }

    const scopeValue = type === 'YEARLY' ? year! : anniversaryYear!
    const scopeKey = buildReviewScopeKey(type, scopeValue)

    await prismaClient.memoryReview.deleteMany({
      where: { coupleId: couple.id, scopeKey },
    })

    const created = await prismaClient.memoryReview.create({
      data: {
        coupleId: couple.id,
        type,
        scopeKey,
        year: year ?? null,
        anniversaryYear: anniversaryYear ?? null,
        periodStart: range.start,
        periodEnd: range.end,
        title: review.title,
        subtitle: review.subtitle,
        summary: review.summary,
        closing: review.closing,
        coverPhotoUrl: review.coverPhotoUrl,
        status: 'READY',
        payload: review.payload,
        publishedAt: new Date(),
      },
    })

    return NextResponse.json({ review: created })
  }
}

export const POST = withAuth(createGenerateMemoryReviewHandler(), {
  requiredRole: 'OWNER',
})
