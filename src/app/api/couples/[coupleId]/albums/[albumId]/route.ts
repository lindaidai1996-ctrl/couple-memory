import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/api-middleware'

type AlbumRouteDeps = {
  prismaClient?: {
    album: {
      findFirst: (args: Record<string, unknown>) => Promise<{
        id: string
        title: string
        description: string | null
        chapters?: unknown[]
        photos?: unknown[]
      } | null>
      updateMany: (args: Record<string, unknown>) => Promise<{ count: number }>
      findUnique: (args: Record<string, unknown>) => Promise<unknown>
      deleteMany: (args: Record<string, unknown>) => Promise<unknown>
    }
  }
}

async function loadPrismaClient() {
  return prisma as unknown as NonNullable<AlbumRouteDeps['prismaClient']>
}

export function createGetAlbumHandler(deps: AlbumRouteDeps = {}) {
  return async (_req: Request, { coupleUser }: AuthContext, params: Record<string, string>) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const album = await prismaClient.album.findFirst({
      where: { id: params.albumId, coupleId: coupleUser.coupleId },
      include: {
        chapters: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            photos: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            },
          },
        },
        photos: {
          where: { chapterId: null },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })
    if (!album) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({
      id: album.id,
      title: album.title,
      description: album.description,
      chapters: album.chapters ?? [],
      ungroupedPhotos: album.photos ?? [],
    })
  }
}

export const GET = withAuth(createGetAlbumHandler())

export const PATCH = withAuth(async (req, { coupleUser }, params) => {
  const body = await req.json()
  const album = await prisma.album.updateMany({
    where: { id: params.albumId, coupleId: coupleUser.coupleId },
    data: body,
  })
  if (album.count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const updated = await prisma.album.findUnique({ where: { id: params.albumId } })
  return NextResponse.json(updated)
})

export const DELETE = withAuth(
  async (req, { coupleUser }, params) => {
    await prisma.album.deleteMany({
      where: { id: params.albumId, coupleId: coupleUser.coupleId },
    })
    return new Response(null, { status: 204 })
  },
  { requiredRole: 'OWNER' }
)
