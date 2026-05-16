import { NextResponse } from 'next/server'

import { withAuth } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'

type CoupleRouteDeps = {
  coupleRecord: {
    id: string
    _count: {
      albums: number
      milestones: number
    }
    [key: string]: unknown
  }
  prisma: {
    couple: {
      findUnique?: (args: Record<string, unknown>) => Promise<CoupleRouteDeps['coupleRecord'] | null>
      update?: (args: {
        where: { id: string }
        data: Record<string, unknown>
      }) => Promise<CoupleRouteDeps['coupleRecord']>
    }
    photo?: {
      count?: (args: Record<string, unknown>) => Promise<number>
    }
  }
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
  deps: CoupleRouteDeps = {
    prisma: prisma as unknown as CoupleRouteDeps['prisma'],
  }
) {
  return async function GET(
    _req: Request,
    { coupleUser }: CoupleAccessContext
  ) {
    const couple = await deps.prisma.couple.findUnique!({
      where: { id: coupleUser.coupleId },
      include: {
        members: { select: { id: true, userId: true, role: true, nickname: true } },
        _count: { select: { albums: true, milestones: true } },
      },
    })

    if (!couple) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const photoCount = await deps.prisma.photo?.count?.({
      where: { album: { coupleId: coupleUser.coupleId } },
    }) ?? 0

    return NextResponse.json({
      ...couple,
      stats: {
        photoCount,
        albumCount: couple._count.albums,
        milestoneCount: couple._count.milestones,
      },
    })
  }
}

export function createCouplePatchHandler(
  deps: CoupleRouteDeps = {
    prisma: prisma as unknown as CoupleRouteDeps['prisma'],
  }
) {
  return async function PATCH(
    req: Request,
    { coupleUser }: CoupleAccessContext
  ) {
    const body = await req.json() as CouplePatchBody

    if (body.slug) {
      const existing = await deps.prisma.couple.findUnique!({
        where: { slug: body.slug },
      })
      if (existing && existing.id !== coupleUser.coupleId) {
        return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
      }
    }

    const updated = await deps.prisma.couple.update!({
      where: { id: coupleUser.coupleId },
      data: buildCoupleUpdateData(body),
    })

    return NextResponse.json(updated)
  }
}

const coupleGetHandler = createCoupleGetHandler()
const couplePatchHandler = createCouplePatchHandler()

export const GET = withAuth((req, ctx) => coupleGetHandler(req, ctx))

export const PATCH = withAuth((req, ctx) => couplePatchHandler(req, ctx), {
  requiredRole: 'OWNER',
})
