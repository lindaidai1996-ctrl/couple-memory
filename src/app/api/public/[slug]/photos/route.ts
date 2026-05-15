import { NextResponse } from 'next/server'
import { withPublicAccess } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'

export const GET = withPublicAccess(async (req, { couple }) => {
  const { searchParams } = new URL(req.url)
  const albumId = searchParams.get('albumId')
  const cursor = searchParams.get('cursor')
  const limit = Math.min(Number(searchParams.get('limit') || 20), 50)

  const where: Record<string, unknown> = {
    album: { coupleId: couple.id },
    status: 'READY',
  }
  if (albumId) where.albumId = albumId

  const photos = await prisma.photo.findMany({
    where,
    orderBy: [{ takenAt: 'desc' }, { createdAt: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      displayUrl: true,
      thumbnailUrl: true,
      width: true,
      height: true,
      takenAt: true,
      locationName: true,
      aiCaption: true,
      userCaption: true,
      aiLayout: true,
      aiMood: true,
      album: { select: { id: true, title: true } },
    },
  })

  const hasMore = photos.length > limit
  if (hasMore) photos.pop()

  return NextResponse.json({
    photos,
    nextCursor: hasMore ? photos[photos.length - 1].id : null,
  })
})
