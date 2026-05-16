import { NextResponse } from 'next/server'

import { createApiErrorResponse, createRequestId } from '@/lib/api-error'
import { withAuth } from '@/lib/api-middleware'

type CoupleRouteDeps = {
  prisma: {
    couple: {
      findUnique?: (args: Record<string, unknown>) => Promise<CoupleRecord | null>
      update?: (args: {
        where: { id: string }
        data: Record<string, unknown>
      }) => Promise<CoupleUpdateRecord>
    }
    photo?: {
      count?: (args: Record<string, unknown>) => Promise<number>
    }
  }
}

type CoupleRecord = {
  id: string
  _count?: {
    albums: number
    milestones: number
  }
  [key: string]: unknown
}

type CoupleUpdateRecord = {
  id: string
  [key: string]: unknown
}

type CouplePatchBody = {
  name?: string
  slug?: string
  startDate?: string | null
  bio?: string | null
  theme?: string
  isPublic?: boolean
  coverMode?: 'NONE' | 'PHOTO' | 'UPLOAD'
  coverPhotoId?: string | null
  coverPhotoUrl?: string | null
}

function normalizeOptionalString(value: unknown) {
  if (value === null) return null
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function buildCoupleUpdateData(body: CouplePatchBody) {
  const data: Record<string, unknown> = {}

  if (body.name !== undefined) data.name = body.name
  if (body.slug !== undefined) data.slug = body.slug
  if (body.startDate !== undefined) {
    data.startDate = body.startDate ? new Date(body.startDate) : null
  }
  if (body.bio !== undefined) data.bio = body.bio
  if (body.theme !== undefined) data.theme = body.theme
  if (body.isPublic !== undefined) data.isPublic = body.isPublic
  if (body.coverMode !== undefined) data.coverMode = body.coverMode
  if (body.coverPhotoId !== undefined) {
    data.coverPhotoId = normalizeOptionalString(body.coverPhotoId)
  }
  if (body.coverPhotoUrl !== undefined) {
    data.coverPhotoUrl = normalizeOptionalString(body.coverPhotoUrl)
  }

  return data
}

type CoupleAccessContext = {
  coupleUser: {
    coupleId: string
  }
}

export function createCoupleGetHandler(
  deps?: Partial<CoupleRouteDeps>
) {
  return async function GET(
    _req: Request,
    { coupleUser }: CoupleAccessContext
  ) {
    const requestId = createRequestId()
    const prisma = deps?.prisma ?? await loadPrisma()
    const couple = await prisma.couple.findUnique!({
      where: { id: coupleUser.coupleId },
      include: {
        members: { select: { id: true, userId: true, role: true, nickname: true } },
        _count: { select: { albums: true, milestones: true } },
      },
    })

    if (!couple) {
      return createApiErrorResponse(404, 'COUPLE_NOT_FOUND', 'Not found', false, requestId)
    }

    const photoCount = await prisma.photo?.count?.({
      where: { album: { coupleId: coupleUser.coupleId } },
    }) ?? 0

    return NextResponse.json({
      ...couple,
      stats: {
        photoCount,
        albumCount: couple._count?.albums ?? 0,
        milestoneCount: couple._count?.milestones ?? 0,
      },
    })
  }
}

export function createCouplePatchHandler(
  deps?: Partial<CoupleRouteDeps>
) {
  return async function PATCH(
    req: Request,
    { coupleUser }: CoupleAccessContext
  ) {
    const requestId = createRequestId()
    const prisma = deps?.prisma ?? await loadPrisma()
    const body = await req.json() as CouplePatchBody

    if (body.slug) {
      const existing = await prisma.couple.findUnique!({
        where: { slug: body.slug },
      })
      if (existing && existing.id !== coupleUser.coupleId) {
        return createApiErrorResponse(409, 'SLUG_ALREADY_TAKEN', 'Slug already taken', false, requestId)
      }
    }

    const updated = await prisma.couple.update!({
      where: { id: coupleUser.coupleId },
      data: buildCoupleUpdateData(body),
    })

    return NextResponse.json(updated)
  }
}

async function loadPrisma() {
  const { prisma } = await import('@/lib/prisma')
  return prisma as unknown as CoupleRouteDeps['prisma']
}

const coupleGetHandler = createCoupleGetHandler()
const couplePatchHandler = createCouplePatchHandler()

export const GET = withAuth((req, ctx) => coupleGetHandler(req, ctx))

export const PATCH = withAuth((req, ctx) => couplePatchHandler(req, ctx), {
  requiredRole: 'OWNER',
})
