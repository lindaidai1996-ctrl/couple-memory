import { NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/api-middleware'

type ChapterMoveRouteDeps = {
  prismaClient?: {
    album: {
      findFirst: (args: Record<string, unknown>) => Promise<{ id: string } | null>
    }
    photo: {
      findMany: (args: Record<string, unknown>) => Promise<Array<{ id: string }>>
      updateMany?: (args: Record<string, unknown>) => Promise<unknown>
    }
    albumChapter?: {
      findFirst?: (args: Record<string, unknown>) => Promise<{ id: string } | null>
    }
  }
}

type MoveBody = {
  photoIds?: unknown
  targetChapterId?: unknown
  action?: unknown
}

function createErrorResponse(status: number, code: string, message: string, retryable = false) {
  return NextResponse.json(
    { error: { code, message, retryable } },
    { status }
  )
}

async function loadPrismaClient() {
  const { prisma } = await import('@/lib/prisma')
  return prisma as unknown as NonNullable<ChapterMoveRouteDeps['prismaClient']>
}

export function createPostAlbumChapterMoveHandler(deps: ChapterMoveRouteDeps = {}) {
  return async (req: Request, { coupleUser }: AuthContext, params: Record<string, string>) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const body = await req.json() as MoveBody
    const photoIds = Array.isArray(body.photoIds) ? body.photoIds.filter((item: unknown): item is string => typeof item === 'string') : []
    const action = typeof body.action === 'string' ? body.action : ''
    const targetChapterId = typeof body.targetChapterId === 'string' ? body.targetChapterId : ''

    if (photoIds.length === 0) {
      return createErrorResponse(400, 'PHOTO_IDS_REQUIRED', 'photoIds is required')
    }

    const album = await prismaClient.album.findFirst({
      where: { id: params.albumId, coupleId: coupleUser.coupleId },
      select: { id: true },
    })

    if (!album) {
      return createErrorResponse(404, 'ALBUM_NOT_FOUND', 'Album not found')
    }

    const photos = await prismaClient.photo.findMany({
      where: { id: { in: photoIds }, albumId: params.albumId },
      select: { id: true },
    })

    if (photos.length !== photoIds.length) {
      return createErrorResponse(400, 'PHOTO_NOT_IN_ALBUM', 'Some photos do not belong to the album')
    }

    if (action === 'UNGROUP') {
      await prismaClient.photo.updateMany!({
        where: {
          id: { in: photoIds },
          albumId: params.albumId,
        },
        data: {
          chapterId: null,
        },
      })
      return NextResponse.json({ ok: true })
    }

    if (action === 'MOVE') {
      const chapter = await prismaClient.albumChapter?.findFirst?.({
        where: {
          id: targetChapterId,
          albumId: params.albumId,
        },
        select: { id: true },
      })

      if (!chapter) {
        return createErrorResponse(404, 'CHAPTER_NOT_FOUND', 'Chapter not found')
      }

      await prismaClient.photo.updateMany!({
        where: {
          id: { in: photoIds },
          albumId: params.albumId,
        },
        data: {
          chapterId: chapter.id,
        },
      })

      return NextResponse.json({ ok: true })
    }

    return createErrorResponse(400, 'INVALID_ACTION', 'action must be MOVE or UNGROUP')
  }
}

export const POST = withAuth(createPostAlbumChapterMoveHandler())
