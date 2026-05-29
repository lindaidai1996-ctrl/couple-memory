import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

type AlbumForMemorySiteReadiness = {
  chapters: Array<{
    id: string
    title?: string
    photos: Array<{ id: string }>
  }>
}

export function buildAlbumMemorySiteReadiness(album: AlbumForMemorySiteReadiness) {
  return {
    chapterCount: album.chapters.length,
    eligiblePhotoCount: album.chapters.reduce(
      (sum, chapter) => sum + chapter.photos.length,
      0
    ),
  }
}

export const GET = withAuth(async (req, { coupleUser }) => {
  const albums = await prisma.album.findMany({
    where: { coupleId: coupleUser.coupleId },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { photos: true } },
      chapters: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          title: true,
          photos: {
            where: {
              status: 'READY',
              OR: [
                { displayUrl: { not: null } },
                { thumbnailUrl: { not: null } },
              ],
            },
            select: { id: true },
          },
        },
      },
    },
  })
  return NextResponse.json({
    albums: albums.map(a => ({
      ...a,
      photoCount: a._count.photos,
      memorySiteReadiness: buildAlbumMemorySiteReadiness(a),
      chapters: a.chapters.map(chapter => ({
        id: chapter.id,
        title: chapter.title,
        eligiblePhotoCount: chapter.photos.length,
      })),
    })),
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
