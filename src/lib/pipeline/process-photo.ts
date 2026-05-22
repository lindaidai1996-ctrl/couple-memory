import { logger } from '@/lib/logger'
import { downloadFromOSS } from '@/lib/oss'
import { generateSizes } from './image-resize'
import { extractExif, type ExifData } from './exif-extract'
import { reverseGeocode } from './geocode'
import { resolvePipelineOutcome } from './run-status'

const TAG = 'pipeline/photo'

type ClientExifData = {
  takenAt: string | null
  latitude: number | null
  longitude: number | null
  cameraMake: string | null
  cameraModel: string | null
  focalLength: string | null
  aperture: string | null
  shutterSpeed: string | null
  iso: number | null
}

type PipelineResultLike = {
  runId?: string
  status: 'COMPLETED' | 'FAILED' | 'DEGRADED'
  nodeResults: Record<string, unknown>
  totalTokens: number
  totalCost: number
  duration: number
  errorCode?: string | null
  summary?: string | null
  triggerType?: string
  attemptNumber?: number
}

type ProcessPhotoPrismaClient = {
  photo: {
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>
    findUnique: (args: {
      where: { id: string }
      include: { album: { include: { couple: true } } }
    }) => Promise<{
      album: {
        coupleId: string
        couple?: {
          captionStylePreference?: string | null
          tonePreference?: string | null
          blockedPhrases?: string[]
        }
      }
    } | null>
  }
}

type RunAIPipelineInput = {
  photoId: string
  photoUrl: string
  exif: Record<string, unknown> | null
  width: number
  height: number
  locationName: string | null
}

type RunAIPipelineFn = (
  input: RunAIPipelineInput,
  coupleId: string,
  options?: { triggerType?: string }
) => Promise<PipelineResultLike>

type ApplyPipelineResultsFn = (
  photoId: string,
  nodeResults: Record<string, unknown>,
  coupleId: string
) => Promise<void>

type ProcessPhotoDeps = {
  prismaClient?: ProcessPhotoPrismaClient
  loggerClient?: typeof logger
  downloadFromOSSImpl?: typeof downloadFromOSS
  generateSizesImpl?: typeof generateSizes
  extractExifImpl?: typeof extractExif
  reverseGeocodeImpl?: typeof reverseGeocode
  runAIPipelineImpl?: RunAIPipelineFn
  applyPipelineResultsImpl?: ApplyPipelineResultsFn
  cdnDomain?: string
}

const MAX_FUTURE_EXIF_MS = 24 * 60 * 60 * 1000

function sanitizeTakenAt(takenAt: Date | null): Date | null {
  if (!takenAt || Number.isNaN(takenAt.getTime())) return null
  if (takenAt.getTime() > Date.now() + MAX_FUTURE_EXIF_MS) return null
  return takenAt
}

export function extractOssKeyFromOriginalUrl(originalUrl: string): string | null {
  try {
    const pathname = new URL(originalUrl).pathname.replace(/^\/+/, '')
    return pathname || null
  } catch {
    const pathname = originalUrl.replace(/^\/+/, '')
    return pathname || null
  }
}

function mergeExif(clientExif: ClientExifData | null, serverExif: ExifData | null): ExifData | null {
  if (!clientExif && !serverExif) return null
  if (!clientExif) {
    return serverExif
      ? {
          ...serverExif,
          takenAt: sanitizeTakenAt(serverExif.takenAt),
        }
      : null
  }
  if (!serverExif) {
    return {
      takenAt: sanitizeTakenAt(clientExif.takenAt ? new Date(clientExif.takenAt) : null),
      latitude: clientExif.latitude,
      longitude: clientExif.longitude,
      cameraMake: clientExif.cameraMake,
      cameraModel: clientExif.cameraModel,
      focalLength: clientExif.focalLength,
      aperture: clientExif.aperture,
      shutterSpeed: clientExif.shutterSpeed,
      iso: clientExif.iso,
    }
  }
  return {
    takenAt: sanitizeTakenAt(
      serverExif.takenAt ?? (clientExif.takenAt ? new Date(clientExif.takenAt) : null)
    ),
    latitude: serverExif.latitude ?? clientExif.latitude,
    longitude: serverExif.longitude ?? clientExif.longitude,
    cameraMake: serverExif.cameraMake ?? clientExif.cameraMake,
    cameraModel: serverExif.cameraModel ?? clientExif.cameraModel,
    focalLength: serverExif.focalLength ?? clientExif.focalLength,
    aperture: serverExif.aperture ?? clientExif.aperture,
    shutterSpeed: serverExif.shutterSpeed ?? clientExif.shutterSpeed,
    iso: serverExif.iso ?? clientExif.iso,
  }
}

async function loadPrismaClient() {
  const { prisma } = await import('@/lib/prisma')
  return prisma as unknown as ProcessPhotoPrismaClient
}

async function loadPipelineFns() {
  const { runAIPipeline, applyPipelineResults } = await import('@/lib/agents/pipeline')
  return {
    runAIPipeline: runAIPipeline as RunAIPipelineFn,
    applyPipelineResults: applyPipelineResults as ApplyPipelineResultsFn,
  }
}

export function createProcessPhoto(deps: ProcessPhotoDeps = {}) {
  const loggerClient = deps.loggerClient ?? logger
  const downloadFromOSSImpl = deps.downloadFromOSSImpl ?? downloadFromOSS
  const generateSizesImpl = deps.generateSizesImpl ?? generateSizes
  const extractExifImpl = deps.extractExifImpl ?? extractExif
  const reverseGeocodeImpl = deps.reverseGeocodeImpl ?? reverseGeocode

  return async function processPhoto(
    photoId: string,
    ossKey: string,
    clientExif?: ClientExifData | null,
    triggerType: 'UPLOAD' | 'MANUAL_RETRY' | 'CAPTION_REGEN' = 'UPLOAD'
  ) {
    loggerClient.info(TAG, '开始处理', { photoId, ossKey })
    try {
      const prismaClient = deps.prismaClient ?? await loadPrismaClient()
      const { runAIPipeline, applyPipelineResults } = deps.runAIPipelineImpl && deps.applyPipelineResultsImpl
        ? {
            runAIPipeline: deps.runAIPipelineImpl,
            applyPipelineResults: deps.applyPipelineResultsImpl,
          }
        : await loadPipelineFns()
      const buffer = await downloadFromOSSImpl(ossKey)
      const basePath = ossKey.replace(/\/original\.\w+$/, '')

      const [sizes, serverExif] = await Promise.all([
        generateSizesImpl(buffer, basePath),
        extractExifImpl(buffer).catch(() => null),
      ])
      const exif = mergeExif(clientExif ?? null, serverExif)
      loggerClient.info(TAG, '图片缩放+EXIF完成', { photoId, width: sizes.width, height: sizes.height })

      let locationName: string | null = null
      if (exif?.latitude && exif?.longitude) {
        locationName = await reverseGeocodeImpl(exif.latitude, exif.longitude).catch(() => null)
      }

      const cdnDomain = deps.cdnDomain ?? process.env.OSS_CDN_DOMAIN
      await prismaClient.photo.update({
        where: { id: photoId },
        data: {
          thumbnailUrl: `https://${cdnDomain}/${sizes.thumbnailPath}`,
          displayUrl: `https://${cdnDomain}/${sizes.displayPath}`,
          width: sizes.width,
          height: sizes.height,
          ...(exif && {
            takenAt: exif.takenAt,
            latitude: exif.latitude,
            longitude: exif.longitude,
            cameraMake: exif.cameraMake,
            cameraModel: exif.cameraModel,
            focalLength: exif.focalLength,
            aperture: exif.aperture,
            shutterSpeed: exif.shutterSpeed,
            iso: exif.iso,
          }),
          locationName,
        },
      })

      const photo = await prismaClient.photo.findUnique({
        where: { id: photoId },
        include: { album: { include: { couple: true } } },
      })

      loggerClient.info(TAG, 'AI Pipeline 开始', { photoId, triggerType })
      const pipelineResult = await runAIPipeline({
        photoId,
        photoUrl: `https://${cdnDomain}/${sizes.displayPath}`,
        exif: exif as Record<string, unknown> | null,
        width: sizes.width || 0,
        height: sizes.height || 0,
        locationName,
        preferences: {
          captionStylePreference: photo?.album.couple?.captionStylePreference ?? null,
          tonePreference: photo?.album.couple?.tonePreference ?? null,
          blockedPhrases: photo?.album.couple?.blockedPhrases ?? [],
        },
      }, photo!.album.coupleId, { triggerType })

      if (pipelineResult.status === 'COMPLETED' || pipelineResult.status === 'DEGRADED') {
        await applyPipelineResults(photoId, pipelineResult.nodeResults, photo!.album.coupleId)
      }

      if (pipelineResult.status !== 'COMPLETED') {
        loggerClient.warn(TAG, 'AI Pipeline 未完全完成', { photoId, status: pipelineResult.status })
      } else {
        loggerClient.info(TAG, 'AI Pipeline 完成', { photoId })
      }

      const outcome = resolvePipelineOutcome({
        latestRunStatus: pipelineResult.status,
        hasDisplayAssets: true,
      })

      await prismaClient.photo.update({
        where: { id: photoId },
        data: {
          status: outcome.photoStatus,
          processingError: pipelineResult.status === 'FAILED' ? (pipelineResult.summary ?? 'AI pipeline failed') : null,
        },
      })
      loggerClient.info(TAG, '处理完成', { photoId, status: outcome.photoStatus })
      return {
        runId: pipelineResult.runId ?? null,
        photoStatus: outcome.photoStatus,
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      loggerClient.error(TAG, '处理失败', { photoId, error: message })
      const prismaClient = deps.prismaClient ?? await loadPrismaClient()
      await prismaClient.photo.update({
        where: { id: photoId },
        data: { status: 'FAILED', processingError: message },
      })
      return {
        runId: null,
        photoStatus: 'FAILED' as const,
      }
    }
  }
}

export const processPhoto = createProcessPhoto()
