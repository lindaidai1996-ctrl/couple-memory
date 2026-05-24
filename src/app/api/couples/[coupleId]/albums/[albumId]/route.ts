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
      delete?: (args: Record<string, unknown>) => Promise<unknown>
    }
    photo?: {
      deleteMany: (args: Record<string, unknown>) => Promise<unknown>
    }
    albumChapter?: {
      deleteMany: (args: Record<string, unknown>) => Promise<unknown>
    }
    photoAIVariant?: {
      deleteMany: (args: Record<string, unknown>) => Promise<unknown>
    }
    pipelineRun?: {
      deleteMany: (args: Record<string, unknown>) => Promise<unknown>
    }
    $transaction?: <T>(callback: (tx: {
      album: { delete: (args: Record<string, unknown>) => Promise<unknown> }
      photo: { deleteMany: (args: Record<string, unknown>) => Promise<unknown> }
      albumChapter: { deleteMany: (args: Record<string, unknown>) => Promise<unknown> }
      photoAIVariant: { deleteMany: (args: Record<string, unknown>) => Promise<unknown> }
      pipelineRun: { deleteMany: (args: Record<string, unknown>) => Promise<unknown> }
    }) => Promise<T>) => Promise<T>
  }
}

type AlbumPatchBody = {
  title?: unknown
  description?: unknown
}

async function loadPrismaClient() {
  return prisma as unknown as NonNullable<AlbumRouteDeps['prismaClient']>
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function buildAlbumUpdateData(body: AlbumPatchBody) {
  const data: Record<string, unknown> = {}

  const title = normalizeOptionalString(body.title)
  if (title) {
    data.title = title
  }

  if (body.description !== undefined) {
    const description = normalizeOptionalString(body.description)
    if (description !== undefined) {
      data.description = description
    }
  }

  return data
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

export function createPatchAlbumHandler(deps: AlbumRouteDeps = {}) {
  return async (req: Request, { coupleUser }: AuthContext, params: Record<string, string>) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const body = await req.json() as AlbumPatchBody
    const album = await prismaClient.album.updateMany({
      where: { id: params.albumId, coupleId: coupleUser.coupleId },
      data: buildAlbumUpdateData(body),
    })
    if (album.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const updated = await prismaClient.album.findUnique({ where: { id: params.albumId } })
    return NextResponse.json(updated)
  }
}

export const PATCH = withAuth(createPatchAlbumHandler())

export function createDeleteAlbumHandler(deps: AlbumRouteDeps = {}) {
  return async (_req: Request, { coupleUser }: AuthContext, params: Record<string, string>) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const album = await prismaClient.album.findFirst({
      where: { id: params.albumId, coupleId: coupleUser.coupleId },
      select: { id: true },
    })

    if (!album) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prismaClient.$transaction!(async tx => {
      await tx.photoAIVariant.deleteMany({
        where: { photo: { albumId: params.albumId } },
      })
      await tx.pipelineRun.deleteMany({
        where: { photo: { albumId: params.albumId } },
      })
      await tx.photo.deleteMany({
        where: { albumId: params.albumId },
      })
      await tx.albumChapter.deleteMany({
        where: { albumId: params.albumId },
      })
      await tx.album.delete({
        where: { id: params.albumId },
      })
    })

    return new Response(null, { status: 204 })
  }
}

export const DELETE = withAuth(createDeleteAlbumHandler(), { requiredRole: 'OWNER' })
