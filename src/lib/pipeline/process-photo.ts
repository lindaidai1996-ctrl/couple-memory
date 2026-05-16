import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { downloadFromOSS } from '@/lib/oss'
import { generateSizes } from './image-resize'
import { extractExif } from './exif-extract'
import { reverseGeocode } from './geocode'
import { runAIPipeline, applyPipelineResults } from '@/lib/agents/pipeline'

const TAG = 'pipeline/photo'

export async function processPhoto(photoId: string, ossKey: string) {
  logger.info(TAG, '开始处理', { photoId, ossKey })
  try {
    const buffer = await downloadFromOSS(ossKey)
    const basePath = ossKey.replace(/\/original\.\w+$/, '')

    const [sizes, exif] = await Promise.all([
      generateSizes(buffer, basePath),
      extractExif(buffer),
    ])
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
