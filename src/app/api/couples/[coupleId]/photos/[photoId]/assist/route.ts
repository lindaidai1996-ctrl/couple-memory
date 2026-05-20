import { NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/api-middleware'
import { buildChapterAwareSuggestions, buildUngroupedSuggestions } from '@/lib/photos/photo-assist'

type PhotoAssistRouteDeps = {
  prismaClient?: {
    photo: {
      findFirst: (args: Record<string, unknown>) => Promise<{
        id: string
        momentContext?: string | null
        momentPromptAnswer?: string | null
        aiScene?: string | null
        locationName?: string | null
        chapter?: { title: string } | null
      } | null>
    }
  }
}

async function loadPrismaClient() {
  const { prisma } = await import('@/lib/prisma')
  return prisma as unknown as NonNullable<PhotoAssistRouteDeps['prismaClient']>
}

export function createPhotoAssistHandler(deps: PhotoAssistRouteDeps = {}) {
  return async (_req: Request, { coupleUser }: AuthContext, params: Record<string, string>) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const photo = await prismaClient.photo.findFirst({
      where: {
        id: params.photoId,
        album: { coupleId: coupleUser.coupleId },
      },
      include: {
        chapter: {
          select: { title: true },
        },
      },
    })

    if (!photo) {
      return NextResponse.json({ error: { code: 'PHOTO_NOT_FOUND', message: 'Photo not found', retryable: false } }, { status: 404 })
    }

    const suggestions = photo.chapter
      ? buildChapterAwareSuggestions({
          chapterTitle: photo.chapter.title,
          momentContext: photo.momentContext,
          momentPromptAnswer: photo.momentPromptAnswer,
          aiScene: photo.aiScene,
          locationName: photo.locationName,
        })
      : buildUngroupedSuggestions({
          momentContext: photo.momentContext,
          momentPromptAnswer: photo.momentPromptAnswer,
          aiScene: photo.aiScene,
          locationName: photo.locationName,
        })

    return NextResponse.json({ suggestions })
  }
}

export const POST = withAuth(createPhotoAssistHandler())
