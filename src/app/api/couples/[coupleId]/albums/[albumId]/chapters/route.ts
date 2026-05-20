import { NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/api-middleware'

type ChapterRouteDeps = {
  prismaClient?: {
    album: {
      findFirst: (args: Record<string, unknown>) => Promise<{
        id: string
        chapters: Array<{ sortOrder: number }>
      } | null>
    }
    photo: {
      findMany: (args: Record<string, unknown>) => Promise<Array<{ id: string }>>
    }
    albumChapter?: {
      findUnique?: (args: Record<string, unknown>) => Promise<unknown>
    }
    $transaction?: <T>(
      callback: (tx: {
        albumChapter: {
          create: (args: Record<string, unknown>) => Promise<{ id: string }>
          findUnique: (args: Record<string, unknown>) => Promise<T>
        }
        photo: {
          updateMany: (args: Record<string, unknown>) => Promise<unknown>
        }
      }) => Promise<T>
    ) => Promise<T>
  }
}

type ChapterCreateBody = {
  title?: unknown
  backgroundNote?: unknown
  photoIds?: unknown
}

function createErrorResponse(status: number, code: string, message: string, retryable = false) {
  return NextResponse.json(
    { error: { code, message, retryable } },
    { status }
  )
}

async function loadPrismaClient() {
  const { prisma } = await import('@/lib/prisma')
  return prisma as unknown as NonNullable<ChapterRouteDeps['prismaClient']>
}

export function createPostAlbumChapterHandler(deps: ChapterRouteDeps = {}) {
  return async (req: Request, { coupleUser }: AuthContext, params: Record<string, string>) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const body = await req.json() as ChapterCreateBody
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const backgroundNote = typeof body.backgroundNote === 'string' ? body.backgroundNote.trim() : ''
    const photoIds = Array.isArray(body.photoIds) ? body.photoIds.filter((item): item is string => typeof item === 'string') : []

    if (!title) {
      return createErrorResponse(400, 'TITLE_REQUIRED', 'title is required')
    }

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
        chapters: {
          select: { sortOrder: true },
          orderBy: [{ sortOrder: 'desc' }],
          take: 1,
        },
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
      select: { id: true },
    })

    if (photos.length !== photoIds.length) {
      return createErrorResponse(400, 'PHOTO_NOT_IN_ALBUM', 'Some photos do not belong to the album')
    }

    const created = await prismaClient.$transaction!(async tx => {
      const chapter = await tx.albumChapter.create({
        data: {
          albumId: params.albumId,
          title,
          backgroundNote: backgroundNote || null,
          sortOrder: (album.chapters[0]?.sortOrder ?? 0) + 1,
        },
      })

      await tx.photo.updateMany({
        where: {
          id: { in: photoIds },
          albumId: params.albumId,
        },
        data: {
          chapterId: chapter.id,
        },
      })

      return tx.albumChapter.findUnique({
        where: { id: chapter.id },
        include: {
          photos: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
      })
    })

    return NextResponse.json(created, { status: 201 })
  }
}

export const POST = withAuth(createPostAlbumChapterHandler())
