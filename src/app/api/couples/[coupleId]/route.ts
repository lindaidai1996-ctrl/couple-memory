import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const GET = withAuth(async (req, { coupleUser }) => {
  const couple = await prisma.couple.findUnique({
    where: { id: coupleUser.coupleId },
    include: {
      members: { select: { id: true, userId: true, role: true, nickname: true } },
      _count: { select: { albums: true, milestones: true } },
    },
  })

  const photoCount = await prisma.photo.count({
    where: { album: { coupleId: coupleUser.coupleId } },
  })

  return NextResponse.json({
    ...couple,
    stats: {
      photoCount,
      albumCount: couple!._count.albums,
      milestoneCount: couple!._count.milestones,
    },
  })
})

export const PATCH = withAuth(
  async (req, { coupleUser }) => {
    const body = await req.json()
    const { name, slug, startDate, bio, theme, isPublic } = body

    if (slug) {
      const existing = await prisma.couple.findUnique({ where: { slug } })
      if (existing && existing.id !== coupleUser.coupleId) {
        return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
      }
    }

    const updated = await prisma.couple.update({
      where: { id: coupleUser.coupleId },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(bio !== undefined && { bio }),
        ...(theme && { theme }),
        ...(isPublic !== undefined && { isPublic }),
      },
    })

    return NextResponse.json(updated)
  },
  { requiredRole: 'OWNER' }
)
