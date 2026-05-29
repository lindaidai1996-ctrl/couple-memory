import { NextResponse } from 'next/server'

import { withAuth, type AuthContext } from '@/lib/api-middleware'
import {
  buildMemorySite,
  type MemorySitePayloadRecord,
  type MemorySiteSectionRecord,
} from '@/lib/memory-sites/site-builder'
import {
  getMemorySiteGenerationSourceByChapters,
} from '@/lib/memory-sites/site-queries'
import { mapMemorySite, type MemorySiteRecord } from '@/lib/memory-sites/site-mappers'
import { prisma } from '@/lib/prisma'

type PublishBody = { action: 'publish' }
type ReplacePhotoBody = {
  action: 'replacePhoto'
  chapterId?: string
  currentPhotoId?: string
  replacementPhotoId?: string
}
type EditCopyBody = {
  action: 'editCopy'
  title?: string
  subtitle?: string | null
  intro?: string
  closing?: string
  sections?: Array<{
    chapterId?: string
    title?: string
    summary?: string
  }>
}
type RegenerateBody = {
  action: 'regenerateSelection'
}

type DetailRouteBody = PublishBody | ReplacePhotoBody | EditCopyBody | RegenerateBody

type DetailRouteDeps = {
  prismaClient?: {
    memorySite: {
      findFirst: (args: Record<string, unknown>) => Promise<MemorySiteRecord | null>
      update: (args: Record<string, unknown>) => Promise<MemorySiteRecord>
    }
    couple: {
      findFirst: (args: Record<string, unknown>) => Promise<unknown>
      update: (args: Record<string, unknown>) => Promise<unknown>
    }
    album: {
      findFirst: (args: Record<string, unknown>) => Promise<unknown>
    }
  }
}

async function loadPrismaClient() {
  return prisma as unknown as NonNullable<DetailRouteDeps['prismaClient']>
}

function normalizePayload(payload: MemorySiteRecord['payload']): MemorySitePayloadRecord {
  if (!payload || typeof payload !== 'object') {
    return {
      style: 'VELVET_PLUM_EDITORIAL',
      sectionCount: 0,
      sections: [],
      albumIds: [],
      chapterIds: [],
      selectionVariant: 0,
    }
  }

  const source = payload as MemorySitePayloadRecord
  return {
    style: source.style === 'VELVET_PLUM_EDITORIAL' ? source.style : 'VELVET_PLUM_EDITORIAL',
    sectionCount: typeof source.sectionCount === 'number' ? source.sectionCount : 0,
    sections: Array.isArray(source.sections) ? source.sections : [],
    albumIds: Array.isArray(source.albumIds) ? source.albumIds : [],
    chapterIds: Array.isArray(source.chapterIds) ? source.chapterIds : [],
    selectionVariant: typeof source.selectionVariant === 'number' ? source.selectionVariant : 0,
  }
}

function mergeSectionCopy(
  existingSections: MemorySiteSectionRecord[],
  nextSections: MemorySiteSectionRecord[]
) {
  const existingByChapterId = new Map(
    existingSections.map(section => [section.chapterId, section] as const)
  )

  return nextSections.map(section => {
    const existing = existingByChapterId.get(section.chapterId)
    if (!existing) {
      return section
    }

    return {
      ...section,
      title: existing.title,
      summary: existing.summary,
    }
  })
}

function buildUpdatedPayload(payload: MemorySitePayloadRecord) {
  return {
    ...payload,
    sectionCount: payload.sections.length,
  }
}

function getErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function findExistingSite(
  prismaClient: NonNullable<DetailRouteDeps['prismaClient']>,
  coupleId: string,
  siteId: string
) {
  return prismaClient.memorySite.findFirst({
    where: { id: siteId, coupleId },
  })
}

async function handlePublishAction(
  prismaClient: NonNullable<DetailRouteDeps['prismaClient']>,
  existing: MemorySiteRecord,
  coupleId: string
) {
  const site = await prismaClient.memorySite.update({
    where: { id: existing.id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  })

  await prismaClient.couple.update({
    where: { id: coupleId },
    data: {
      isPublic: true,
    },
  })

  return NextResponse.json({ site: mapMemorySite(site) })
}

async function handleRegenerateSelectionAction(
  prismaClient: NonNullable<DetailRouteDeps['prismaClient']>,
  existing: MemorySiteRecord,
  coupleId: string
) {
  const payload = normalizePayload(existing.payload)
  const sourceChapterIds = Array.isArray(existing.sourceChapterIds) ? existing.sourceChapterIds : []
  if (sourceChapterIds.length === 0) {
    return getErrorResponse('Source chapters are missing', 422)
  }

  const source = await getMemorySiteGenerationSourceByChapters(
    coupleId,
    sourceChapterIds,
    prismaClient as never
  )

  if (!source) {
    return getErrorResponse('Source chapters not found', 404)
  }

  const nextVariant = (payload.selectionVariant ?? 0) + 1
  const rebuilt = buildMemorySite({
    coupleName: source.couple.name,
    style: existing.style,
    startDate: source.couple.startDate,
    selectionVariant: nextVariant,
    albums: source.albums,
    chapters: source.chapters,
  })

  const mergedSections = mergeSectionCopy(payload.sections, rebuilt.sections)
  const nextPayload = buildUpdatedPayload({
    ...rebuilt.payload,
    sections: mergedSections,
  })

  const site = await prismaClient.memorySite.update({
    where: { id: existing.id },
    data: {
      title: existing.title,
      subtitle: existing.subtitle,
      intro: existing.intro,
      closing: existing.closing,
      coverPhotoUrl: rebuilt.coverPhotoUrl,
      payload: nextPayload,
      publishedAt: existing.publishedAt,
    },
  })

  return NextResponse.json({ site: mapMemorySite(site) })
}

async function handleReplacePhotoAction(
  prismaClient: NonNullable<DetailRouteDeps['prismaClient']>,
  existing: MemorySiteRecord,
  coupleId: string,
  body: ReplacePhotoBody
) {
  const payload = normalizePayload(existing.payload)
  if (!body.chapterId || !body.currentPhotoId || !body.replacementPhotoId) {
    return getErrorResponse('chapterId, currentPhotoId, and replacementPhotoId are required', 400)
  }

  const sourceChapterIds = Array.isArray(existing.sourceChapterIds) ? existing.sourceChapterIds : []
  const source = await getMemorySiteGenerationSourceByChapters(
    coupleId,
    sourceChapterIds,
    prismaClient as never
  )

  const sourceChapter = source?.chapters.find(chapter => chapter.id === body.chapterId)
  if (!sourceChapter) {
    return getErrorResponse('Chapter not found', 404)
  }

  const replacement = sourceChapter.photos.find(photo => photo.id === body.replacementPhotoId)
  if (!replacement || (!replacement.displayUrl && !replacement.thumbnailUrl)) {
    return getErrorResponse('Replacement photo not found', 404)
  }

  let replacedCoverUrl = existing.coverPhotoUrl
  let hasReplacedPhoto = false
  const nextSections = payload.sections.map(section => {
    if (section.chapterId !== body.chapterId) {
      return section
    }

    return {
      ...section,
      photos: section.photos.map(photo => {
        if (photo.id !== body.currentPhotoId) {
          return photo
        }

        hasReplacedPhoto = true
        const replacementImageUrl = replacement.displayUrl ?? replacement.thumbnailUrl ?? ''
        if (existing.coverPhotoUrl === photo.imageUrl) {
          replacedCoverUrl = replacementImageUrl
        }

        return {
          id: replacement.id,
          imageUrl: replacementImageUrl,
          locationName: replacement.locationName,
          takenAt: replacement.takenAt?.toISOString() ?? null,
          narrative:
            replacement.userCaption?.trim() ||
            replacement.aiCaption?.trim() ||
            '这一幕被保留下来，成为这一阶段最具体的注脚。',
          role: photo.role,
        }
      }),
    }
  })

  if (!hasReplacedPhoto) {
    return getErrorResponse('Current photo not found', 404)
  }

  const site = await prismaClient.memorySite.update({
    where: { id: existing.id },
    data: {
      coverPhotoUrl: replacedCoverUrl,
      payload: buildUpdatedPayload({
        ...payload,
        sections: nextSections,
      }),
    },
  })

  return NextResponse.json({ site: mapMemorySite(site) })
}

async function handleEditCopyAction(
  prismaClient: NonNullable<DetailRouteDeps['prismaClient']>,
  existing: MemorySiteRecord,
  body: EditCopyBody
) {
  const payload = normalizePayload(existing.payload)
  const updates = new Map(
    (body.sections ?? [])
      .filter(section => typeof section.chapterId === 'string' && section.chapterId.trim())
      .map(section => [section.chapterId!, section] as const)
  )

  const nextSections = payload.sections.map(section => {
    const update = updates.get(section.chapterId)
    if (!update) {
      return section
    }

    return {
      ...section,
      title: update.title?.trim() || section.title,
      summary: update.summary?.trim() || section.summary,
    }
  })

  const title = body.title?.trim() || existing.title
  const intro = body.intro?.trim() || existing.intro
  const closing = body.closing?.trim() || existing.closing
  const subtitle = typeof body.subtitle === 'string'
    ? (body.subtitle.trim() || null)
    : existing.subtitle

  const site = await prismaClient.memorySite.update({
    where: { id: existing.id },
    data: {
      title,
      subtitle,
      intro,
      closing,
      payload: buildUpdatedPayload({
        ...payload,
        sections: nextSections,
      }),
    },
  })

  return NextResponse.json({ site: mapMemorySite(site) })
}

export function createPublishMemorySiteHandler(deps: DetailRouteDeps = {}) {
  return async (
    req: Request,
    { coupleUser }: AuthContext,
    params: Record<string, string>
  ) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const body = await req.json().catch(() => ({})) as DetailRouteBody

    const existing = await findExistingSite(prismaClient, coupleUser.coupleId, params.siteId)
    if (!existing) {
      return getErrorResponse('Not found', 404)
    }

    if (body.action === 'publish') {
      return handlePublishAction(prismaClient, existing, coupleUser.coupleId)
    }

    if (body.action === 'regenerateSelection') {
      return handleRegenerateSelectionAction(prismaClient, existing, coupleUser.coupleId)
    }

    if (body.action === 'replacePhoto') {
      return handleReplacePhotoAction(prismaClient, existing, coupleUser.coupleId, body)
    }

    if (body.action === 'editCopy') {
      return handleEditCopyAction(prismaClient, existing, body)
    }

    return getErrorResponse('Unsupported action', 400)
  }
}

export const PATCH = withAuth(createPublishMemorySiteHandler(), {
  requiredRole: 'OWNER',
})
