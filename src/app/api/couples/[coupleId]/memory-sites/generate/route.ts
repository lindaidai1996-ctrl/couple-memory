import { NextResponse } from 'next/server'

import { withAuth, type AuthContext } from '@/lib/api-middleware'
import { buildMemorySite, type MemorySiteStyle } from '@/lib/memory-sites/site-builder'
import {
  getMemorySiteGenerationSource,
  getMemorySiteGenerationSourceByChapters,
} from '@/lib/memory-sites/site-queries'
import { prisma } from '@/lib/prisma'

type GenerateBody = {
  albumId?: string
  chapterIds?: string[]
  style?: MemorySiteStyle
}

type GenerateSource = Awaited<ReturnType<typeof getMemorySiteGenerationSourceByChapters>>

type GenerateRouteDeps = {
  prismaClient?: {
    album: {
      findFirst: (args: Record<string, unknown>) => Promise<GenerateSource>
    }
    memorySite: {
      upsert: (args: Record<string, unknown>) => Promise<unknown>
    }
  }
}

async function loadPrismaClient() {
  return prisma as unknown as NonNullable<GenerateRouteDeps['prismaClient']>
}

function buildMemorySiteScopeKey(chapterIds: string[], style: MemorySiteStyle) {
  return `chapters:${chapterIds.slice().sort().join(',')}:style:${style}`
}

export function createGenerateMemorySiteHandler(deps: GenerateRouteDeps = {}) {
  return async (req: Request, { coupleUser }: AuthContext) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const body = await req.json().catch(() => ({})) as GenerateBody

    const requestedChapterIds = Array.isArray(body.chapterIds)
      ? [...new Set(body.chapterIds.filter(id => typeof id === 'string' && id.trim()))]
      : []

    if (requestedChapterIds.length === 0 && !body.albumId) {
      return NextResponse.json({ error: 'chapterIds or albumId is required' }, { status: 400 })
    }

    const style = body.style ?? 'VELVET_PLUM_EDITORIAL'
    const source = requestedChapterIds.length > 0
      ? await getMemorySiteGenerationSourceByChapters(
        coupleUser.coupleId,
        requestedChapterIds,
        prismaClient as never
      )
      : await getMemorySiteGenerationSource(
        coupleUser.coupleId,
        body.albumId!,
        prismaClient as never
      )

    if (!source) {
      return NextResponse.json({ error: 'Source chapters not found' }, { status: 404 })
    }

    let built
    try {
      built = buildMemorySite({
        coupleName: source.couple.name,
        style,
        startDate: source.couple.startDate,
        albums: source.albums,
        chapters: source.chapters,
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_ENOUGH_MEMORY_SITE_CONTENT') {
        return NextResponse.json(
          { error: 'Not enough content to build memory site' },
          { status: 422 }
        )
      }

      throw error
    }

    const sourceChapterIds = source.chapters.map(chapter => chapter.id)
    const sourceAlbumIds = [...new Set(source.chapters.map(chapter => chapter.albumId))]
    const scopeKey = buildMemorySiteScopeKey(sourceChapterIds, style)
    const site = await prismaClient.memorySite.upsert({
      where: {
        coupleId_scopeKey: {
          coupleId: coupleUser.coupleId,
          scopeKey,
        },
      },
      update: {
        sourceAlbumId: sourceAlbumIds.length === 1 ? sourceAlbumIds[0] : null,
        sourceChapterIds,
        style,
        status: 'READY',
        title: built.title,
        subtitle: built.subtitle,
        intro: built.intro,
        closing: built.closing,
        coverPhotoUrl: built.coverPhotoUrl,
        payload: built.payload,
        publishedAt: null,
      },
      create: {
        coupleId: coupleUser.coupleId,
        scopeKey,
        sourceAlbumId: sourceAlbumIds.length === 1 ? sourceAlbumIds[0] : null,
        sourceChapterIds,
        style,
        status: 'READY',
        title: built.title,
        subtitle: built.subtitle,
        intro: built.intro,
        closing: built.closing,
        coverPhotoUrl: built.coverPhotoUrl,
        payload: built.payload,
      },
    })

    return NextResponse.json({ site })
  }
}

export const POST = withAuth(createGenerateMemorySiteHandler(), {
  requiredRole: 'OWNER',
})
