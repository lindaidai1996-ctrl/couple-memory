import { prisma } from '@/lib/prisma'

import { mapMemorySite, type MemorySiteRecord } from './site-mappers'

type GenerationSourceAlbum = {
  id: string
  title: string
  description: string | null
  coverPhotoUrl: string | null
}

type GenerationSourceChapterPhoto = {
  id: string
  displayUrl: string | null
  thumbnailUrl: string | null
  takenAt: Date | null
  locationName: string | null
  userCaption: string | null
  aiCaption: string | null
  aiMood: string | null
}

type GenerationSourceChapter = {
  id: string
  albumId: string
  title: string
  aiSummary: string | null
  photos: GenerationSourceChapterPhoto[]
}

export type MemorySiteGenerationSource = {
  couple: {
    id: string
    name: string
    startDate: Date | null
  }
  albums: GenerationSourceAlbum[]
  chapters: GenerationSourceChapter[]
}

export type MemorySiteEditorSource = {
  albumIds: string[]
  chapterIds: string[]
  chapters: Array<{
    id: string
    albumId: string
    albumTitle: string
    title: string
    photos: Array<{
      id: string
      imageUrl: string
      takenAt: string | null
      locationName: string | null
      narrative: string
    }>
  }>
}

type SiteQueryClient = {
  couple: {
    findFirst: (args: Record<string, unknown>) => Promise<{
      id: string
      name: string
      startDate: Date | null
      albums: Array<GenerationSourceAlbum & {
        chapters: Array<{
          id: string
          title: string
          aiSummary: string | null
          photos: GenerationSourceChapterPhoto[]
        }>
      }>
    } | null>
  }
  album: {
    findFirst: (args: Record<string, unknown>) => Promise<{
      id: string
      title: string
      description: string | null
      coverPhotoUrl: string | null
      couple: {
        id: string
        name: string
        startDate: Date | null
      }
      chapters: Array<{
        id: string
        title: string
        aiSummary: string | null
        photos: GenerationSourceChapterPhoto[]
      }>
    } | null>
  }
  memorySite: {
    findMany: (args: Record<string, unknown>) => Promise<MemorySiteRecord[]>
    findFirst: (args: Record<string, unknown>) => Promise<MemorySiteRecord | null>
  }
}

function getClient(client?: SiteQueryClient) {
  return client ?? (prisma as unknown as SiteQueryClient)
}

function normalizeGenerationSource(input: MemorySiteGenerationSource) {
  const chapterOrder = new Map(input.chapters.map((chapter, index) => [chapter.id, index]))

  return {
    ...input,
    albums: input.albums.filter(album =>
      input.chapters.some(chapter => chapter.albumId === album.id)
    ),
    chapters: [...input.chapters].sort(
      (left, right) => (chapterOrder.get(left.id) ?? 0) - (chapterOrder.get(right.id) ?? 0)
    ),
  }
}

export async function getMemorySiteGenerationSource(
  coupleId: string,
  albumId: string,
  client?: SiteQueryClient
) {
  const prismaClient = getClient(client)
  const album = await prismaClient.album.findFirst({
    where: { id: albumId, coupleId },
    select: {
      id: true,
      title: true,
      description: true,
      coverPhotoUrl: true,
      couple: {
        select: {
          id: true,
          name: true,
          startDate: true,
        },
      },
      chapters: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          title: true,
          aiSummary: true,
          photos: {
            where: { status: 'READY' },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: {
              id: true,
              displayUrl: true,
              thumbnailUrl: true,
              takenAt: true,
              locationName: true,
              userCaption: true,
              aiCaption: true,
              aiMood: true,
            },
          },
        },
      },
    },
  })

  if (!album) {
    return null
  }

  return normalizeGenerationSource({
    couple: album.couple,
    albums: [
      {
        id: album.id,
        title: album.title,
        description: album.description,
        coverPhotoUrl: album.coverPhotoUrl,
      },
    ],
    chapters: album.chapters.map(chapter => ({
      id: chapter.id,
      albumId: album.id,
      title: chapter.title,
      aiSummary: chapter.aiSummary,
      photos: chapter.photos,
    })),
  })
}

export async function getMemorySiteGenerationSourceByChapters(
  coupleId: string,
  chapterIds: string[],
  client?: SiteQueryClient
) {
  const prismaClient = getClient(client)
  const uniqueChapterIds = [...new Set(chapterIds.filter(Boolean))]
  if (uniqueChapterIds.length === 0) {
    return null
  }

  const couple = await prismaClient.couple.findFirst({
    where: { id: coupleId },
    select: {
      id: true,
      name: true,
      startDate: true,
      albums: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          title: true,
          description: true,
          coverPhotoUrl: true,
          chapters: {
            where: { id: { in: uniqueChapterIds } },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: {
              id: true,
              title: true,
              aiSummary: true,
              photos: {
                where: { status: 'READY' },
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
                select: {
                  id: true,
                  displayUrl: true,
                  thumbnailUrl: true,
                  takenAt: true,
                  locationName: true,
                  userCaption: true,
                  aiCaption: true,
                  aiMood: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!couple) {
    return null
  }

  const chapterMap = new Map(
    couple.albums.flatMap(album =>
      album.chapters.map(chapter => [
        chapter.id,
        {
          id: chapter.id,
          albumId: album.id,
          title: chapter.title,
          aiSummary: chapter.aiSummary,
          photos: chapter.photos,
        },
      ] as const)
    )
  )

  const orderedChapters = uniqueChapterIds
    .map(chapterId => chapterMap.get(chapterId))
    .filter((chapter): chapter is GenerationSourceChapter => Boolean(chapter))

  if (orderedChapters.length === 0) {
    return null
  }

  return normalizeGenerationSource({
    couple: {
      id: couple.id,
      name: couple.name,
      startDate: couple.startDate,
    },
    albums: couple.albums.map(album => ({
      id: album.id,
      title: album.title,
      description: album.description,
      coverPhotoUrl: album.coverPhotoUrl,
    })),
    chapters: orderedChapters,
  })
}

export async function getMemorySiteEditorSource(
  coupleId: string,
  chapterIds: string[],
  client?: SiteQueryClient
): Promise<MemorySiteEditorSource | null> {
  const source = await getMemorySiteGenerationSourceByChapters(coupleId, chapterIds, client)
  if (!source) {
    return null
  }

  const albumTitleMap = new Map(source.albums.map(album => [album.id, album.title]))

  return {
    albumIds: source.albums.map(album => album.id),
    chapterIds: source.chapters.map(chapter => chapter.id),
    chapters: source.chapters.map(chapter => ({
      id: chapter.id,
      albumId: chapter.albumId,
      albumTitle: albumTitleMap.get(chapter.albumId) ?? 'Untitled album',
      title: chapter.title,
      photos: chapter.photos
        .filter(photo => photo.displayUrl || photo.thumbnailUrl)
        .map(photo => ({
          id: photo.id,
          imageUrl: photo.displayUrl ?? photo.thumbnailUrl ?? '',
          takenAt: photo.takenAt?.toISOString() ?? null,
          locationName: photo.locationName,
          narrative:
            photo.userCaption?.trim() ||
            photo.aiCaption?.trim() ||
            '这一幕被保留下来，成为这一阶段最具体的注脚。',
        })),
    })),
  }
}

export async function getMemorySiteById(
  coupleId: string,
  siteId: string,
  client?: SiteQueryClient
) {
  const prismaClient = getClient(client)
  const site = await prismaClient.memorySite.findFirst({
    where: { id: siteId, coupleId },
  })

  return site ? mapMemorySite(site) : null
}

export async function getPublishedMemorySiteByCoupleId(
  coupleId: string,
  client?: SiteQueryClient
) {
  const prismaClient = getClient(client)
  const site = await prismaClient.memorySite.findFirst({
    where: {
      coupleId,
      status: 'PUBLISHED',
      publishedAt: { not: null },
    },
    orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
  })

  return site ? mapMemorySite(site) : null
}
