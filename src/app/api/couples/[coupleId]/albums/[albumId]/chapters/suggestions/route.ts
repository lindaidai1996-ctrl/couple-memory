import { NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/api-middleware'
import { suggestChapterTitles } from '@/lib/albums/chapter-title-suggester'

type ChapterSuggestionsRouteDeps = {
  prismaClient?: {
    album: {
      findFirst: (args: Record<string, unknown>) => Promise<{
        id: string
        title: string
      } | null>
    }
    photo: {
      findMany: (args: Record<string, unknown>) => Promise<Array<{
        id: string
        aiScene?: string | null
        locationName?: string | null
      }>>
    }
  }
}

function createErrorResponse(status: number, code: string, message: string, retryable = false) {
  return NextResponse.json(
    { error: { code, message, retryable } },
    { status }
  )
}

async function loadPrismaClient() {
  const { prisma } = await import('@/lib/prisma')
  return prisma as unknown as NonNullable<ChapterSuggestionsRouteDeps['prismaClient']>
}

export function createChapterSuggestionsHandler(deps: ChapterSuggestionsRouteDeps = {}) {
  return async (req: Request, { coupleUser }: AuthContext, params: Record<string, string>) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const body = await req.json().catch(() => ({} as { photoIds?: unknown }))
    const photoIds = Array.isArray(body.photoIds)
      ? body.photoIds.filter((item: unknown): item is string => typeof item === 'string')
      : []

    if (photoIds.length === 0) {
      return createErrorResponse(400, 'PHOTO_IDS_REQUIRED', 'photoIds is required')
    }

    const album = await prismaClient.album.findFirst({
      where: {
        id: params.albumId,
        coupleId: coupleUser.coupleId,
      },
      select: {
        id: true,
        title: true,
      },
    })

    if (!album) {
      return createErrorResponse(404, 'ALBUM_NOT_FOUND', 'Album not found')
    }

    const photos = await prismaClient.photo.findMany({
      where: {
        id: { in: photoIds },
        albumId: params.albumId,
      },
      select: {
        id: true,
        aiScene: true,
        locationName: true,
      },
    })

    if (photos.length !== photoIds.length) {
      return createErrorResponse(400, 'PHOTO_NOT_IN_ALBUM', 'Some photos do not belong to the album')
    }

    const suggestions = await suggestChapterTitles({
      albumTitle: album.title,
      photoCount: photos.length,
      scenes: photos.map(photo => photo.aiScene ?? '').filter(Boolean),
      locations: photos.map(photo => photo.locationName ?? '').filter(Boolean),
    })

    return NextResponse.json({ suggestions })
  }
}

export const POST = withAuth(createChapterSuggestionsHandler())
