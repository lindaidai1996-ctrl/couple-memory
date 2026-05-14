import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const GET = withAuth(async (req, { coupleUser }) => {
  const albums = await prisma.album.findMany({
    where: { coupleId: coupleUser.coupleId },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { photos: true } } },
  })
  return NextResponse.json({
    albums: albums.map(a => ({ ...a, photoCount: a._count.photos })),
    total: albums.length,
  })
})

export const POST = withAuth(async (req, { coupleUser }) => {
  const { title, description } = await req.json()
  if (!title) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 })
  }

  const maxSort = await prisma.album.aggregate({
    where: { coupleId: coupleUser.coupleId },
    _max: { sortOrder: true },
  })

  const album = await prisma.album.create({
    data: {
      coupleId: coupleUser.coupleId,
      title,
      description,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  })
  return NextResponse.json(album, { status: 201 })
})
