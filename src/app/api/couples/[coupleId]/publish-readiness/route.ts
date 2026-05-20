import { NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/api-middleware'
import { buildOrganizationReadiness } from '@/lib/readiness/organization-readiness'

type ReadinessRouteDeps = {
  prismaClient?: {
    photo: {
      count: (args: Record<string, unknown>) => Promise<number>
    }
    albumChapter: {
      count: (args: Record<string, unknown>) => Promise<number>
    }
  }
}

async function loadPrismaClient() {
  const { prisma } = await import('@/lib/prisma')
  return prisma as unknown as NonNullable<ReadinessRouteDeps['prismaClient']>
}

export function createOrganizationReadinessHandler(deps: ReadinessRouteDeps = {}) {
  return async (_req: Request, { coupleUser }: AuthContext) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const [totalPhotos, chapterPhotoCount, chapterCount] = await Promise.all([
      prismaClient.photo.count({ where: { album: { coupleId: coupleUser.coupleId } } }),
      prismaClient.photo.count({ where: { album: { coupleId: coupleUser.coupleId }, chapterId: { not: null } } }),
      prismaClient.albumChapter.count({ where: { album: { coupleId: coupleUser.coupleId } } }),
    ])

    return NextResponse.json(buildOrganizationReadiness({
      totalPhotos,
      chapterPhotoCount,
      chapterCount,
    }))
  }
}

export const GET = withAuth(createOrganizationReadinessHandler())
