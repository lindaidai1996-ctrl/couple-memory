import { NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/api-middleware'

type ChapterDetailRouteDeps = {
  prismaClient?: {
    albumChapter: {
      findFirst: (args: Record<string, unknown>) => Promise<{
        id: string
        albumId?: string
        title?: string
        backgroundNote?: string | null
        aiSummary?: string | null
        photos?: unknown[]
      } | null>
      update?: (args: Record<string, unknown>) => Promise<unknown>
    }
    $transaction?: <T>(
      callback: (tx: {
        photo: {
          updateMany: (args: Record<string, unknown>) => Promise<unknown>
        }
        albumChapter: {
          delete: (args: Record<string, unknown>) => Promise<unknown>
        }
      }) => Promise<T>
    ) => Promise<T>
  }
}

type ChapterPatchBody = {
  title?: unknown
  backgroundNote?: unknown
}

function createErrorResponse(status: number, code: string, message: string, retryable = false) {
  return NextResponse.json(
    { error: { code, message, retryable } },
    { status }
  )
}

async function loadPrismaClient() {
  const { prisma } = await import('@/lib/prisma')
  return prisma as unknown as NonNullable<ChapterDetailRouteDeps['prismaClient']>
}

export function createGetAlbumChapterHandler(deps: ChapterDetailRouteDeps = {}) {
  return async (_req: Request, { coupleUser }: AuthContext, params: Record<string, string>) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const chapter = await prismaClient.albumChapter.findFirst({
      where: {
        id: params.chapterId,
        albumId: params.albumId,
        album: { coupleId: coupleUser.coupleId },
      },
      include: {
        photos: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })

    if (!chapter) {
      return createErrorResponse(404, 'CHAPTER_NOT_FOUND', 'Chapter not found')
    }

    return NextResponse.json(chapter)
  }
}

export function createPatchAlbumChapterHandler(deps: ChapterDetailRouteDeps = {}) {
  return async (req: Request, { coupleUser }: AuthContext, params: Record<string, string>) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const body = await req.json() as ChapterPatchBody
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const backgroundNote = typeof body.backgroundNote === 'string' ? body.backgroundNote.trim() : ''

    const chapter = await prismaClient.albumChapter.findFirst({
      where: {
        id: params.chapterId,
        albumId: params.albumId,
        album: { coupleId: coupleUser.coupleId },
      },
      select: { id: true },
    })

    if (!chapter) {
      return createErrorResponse(404, 'CHAPTER_NOT_FOUND', 'Chapter not found')
    }

    if (!title) {
      return createErrorResponse(400, 'TITLE_REQUIRED', 'title is required')
    }

    const updated = await prismaClient.albumChapter.update!({
      where: { id: params.chapterId },
      data: {
        title,
        backgroundNote: backgroundNote || null,
      },
    })

    return NextResponse.json(updated)
  }
}

export function createDeleteAlbumChapterHandler(deps: ChapterDetailRouteDeps = {}) {
  return async (_req: Request, { coupleUser }: AuthContext, params: Record<string, string>) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const chapter = await prismaClient.albumChapter.findFirst({
      where: {
        id: params.chapterId,
        albumId: params.albumId,
        album: { coupleId: coupleUser.coupleId },
      },
      select: { id: true },
    })

    if (!chapter) {
      return createErrorResponse(404, 'CHAPTER_NOT_FOUND', 'Chapter not found')
    }

    await prismaClient.$transaction!(async tx => {
      await tx.photo.updateMany({
        where: { chapterId: params.chapterId },
        data: { chapterId: null },
      })

      await tx.albumChapter.delete({
        where: { id: params.chapterId },
      })
    })

    return new Response(null, { status: 204 })
  }
}

export const GET = withAuth(createGetAlbumChapterHandler())
export const PATCH = withAuth(createPatchAlbumChapterHandler())
export const DELETE = withAuth(createDeleteAlbumChapterHandler())
