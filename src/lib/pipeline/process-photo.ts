import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { downloadFromOSS } from '@/lib/oss'
import { generateSizes } from './image-resize'
import { extractExif, type ExifData } from './exif-extract'
import { reverseGeocode } from './geocode'
import { runAIPipeline, applyPipelineResults } from '@/lib/agents/pipeline'

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

export async function processPhoto(photoId: string, ossKey: string, clientExif?: ClientExifData | null) {
  logger.info(TAG, '开始处理', { photoId, ossKey })
  try {
    const buffer = await downloadFromOSS(ossKey)
    const basePath = ossKey.replace(/\/original\.\w+$/, '')

    const [sizes, serverExif] = await Promise.all([
      generateSizes(buffer, basePath),
      extractExif(buffer).catch(() => null),
    ])
    const exif = mergeExif(clientExif ?? null, serverExif)
    logger.info(TAG, '图片缩放+EXIF完成', { photoId, width: sizes.width, height: sizes.height })

    let locationName: string | null = null
    if (exif?.latitude && exif?.longitude) {
      locationName = await reverseGeocode(exif.latitude, exif.longitude).catch(() => null)
    }

    const cdnDomain = process.env.OSS_CDN_DOMAIN
    await prisma.photo.update({
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

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { album: true },
    })

    logger.info(TAG, 'AI Pipeline 开始', { photoId })
    const pipelineResult = await runAIPipeline({
      photoId,
      photoUrl: `https://${cdnDomain}/${sizes.displayPath}`,
      exif: exif as Record<string, unknown> | null,
      width: sizes.width || 0,
      height: sizes.height || 0,
      locationName,
    }, photo!.album.coupleId)

    if (pipelineResult.status === 'COMPLETED') {
      await applyPipelineResults(photoId, pipelineResult.nodeResults, photo!.album.coupleId)
      logger.info(TAG, 'AI Pipeline 完成', { photoId })
    } else {
      logger.warn(TAG, 'AI Pipeline 未完成', { photoId, status: pipelineResult.status })
    }

    await prisma.photo.update({
      where: { id: photoId },
      data: { status: 'READY' },
    })
    logger.info(TAG, '处理完成', { photoId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error(TAG, '处理失败', { photoId, error: message })
    await prisma.photo.update({
      where: { id: photoId },
      data: { status: 'FAILED', processingError: message },
    })
  }
}
