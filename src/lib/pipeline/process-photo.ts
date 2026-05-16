import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { downloadFromOSS } from '@/lib/oss'
import { generateSizes } from './image-resize'
import { extractExif, type ExifData } from './exif-extract'
import { reverseGeocode } from './geocode'
import { runAIPipeline, applyPipelineResults } from '@/lib/agents/pipeline'
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
  status: 'COMPLETED' | 'FAILED' | 'DEGRADED'
  nodeResults: Awaited<ReturnType<typeof runAIPipeline>>['nodeResults']
  totalTokens: number
  totalCost: number
  duration: number
  errorCode?: string | null
  summary?: string | null
  triggerType?: string
  attemptNumber?: number
}

type ProcessPhotoDeps = {
  prismaClient?: typeof prisma
  loggerClient?: typeof logger
  downloadFromOSSImpl?: typeof downloadFromOSS
  generateSizesImpl?: typeof generateSizes
  extractExifImpl?: typeof extractExif
  reverseGeocodeImpl?: typeof reverseGeocode
  runAIPipelineImpl?: (
    input: Parameters<typeof runAIPipeline>[0],
    coupleId: string,
    options?: { triggerType?: string }
  ) => Promise<PipelineResultLike>
  applyPipelineResultsImpl?: typeof applyPipelineResults
  cdnDomain?: string
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
  if (!clientExif) return serverExif
  if (!serverExif) {
    return {
      takenAt: clientExif.takenAt ? new Date(clientExif.takenAt) : null,
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
    takenAt: serverExif.takenAt ?? (clientExif.takenAt ? new Date(clientExif.takenAt) : null),
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

export function createProcessPhoto(deps: ProcessPhotoDeps = {}) {
  const prismaClient = deps.prismaClient ?? prisma
  const loggerClient = deps.loggerClient ?? logger
  const downloadFromOSSImpl = deps.downloadFromOSSImpl ?? downloadFromOSS
  const generateSizesImpl = deps.generateSizesImpl ?? generateSizes
  const extractExifImpl = deps.extractExifImpl ?? extractExif
  const reverseGeocodeImpl = deps.reverseGeocodeImpl ?? reverseGeocode
  const runAIPipelineImpl = deps.runAIPipelineImpl ?? runAIPipeline
  const applyPipelineResultsImpl = deps.applyPipelineResultsImpl ?? applyPipelineResults

  return async function processPhoto(
    photoId: string,
    ossKey: string,
    clientExif?: ClientExifData | null,
    triggerType: 'UPLOAD' | 'RETRY' = 'UPLOAD'
  ) {
    loggerClient.info(TAG, '开始处理', { photoId, ossKey })
    try {
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
        include: { album: true },
      })

      loggerClient.info(TAG, 'AI Pipeline 开始', { photoId, triggerType })
      const pipelineResult = await runAIPipelineImpl({
        photoId,
        photoUrl: `https://${cdnDomain}/${sizes.displayPath}`,
        exif: exif as Record<string, unknown> | null,
        width: sizes.width || 0,
        height: sizes.height || 0,
        locationName,
      }, photo!.album.coupleId, { triggerType })

      if (pipelineResult.status === 'COMPLETED' || pipelineResult.status === 'DEGRADED') {
        await applyPipelineResultsImpl(photoId, pipelineResult.nodeResults, photo!.album.coupleId)
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      loggerClient.error(TAG, '处理失败', { photoId, error: message })
      await prismaClient.photo.update({
        where: { id: photoId },
        data: { status: 'FAILED', processingError: message },
      })
    }
  }
}

export const processPhoto = createProcessPhoto()
