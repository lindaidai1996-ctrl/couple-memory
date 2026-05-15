import { prisma } from '@/lib/prisma'
import { downloadFromOSS } from '@/lib/oss'
import { generateSizes } from './image-resize'
import { extractExif } from './exif-extract'
import { reverseGeocode } from './geocode'

export async function processPhoto(photoId: string, ossKey: string) {
  try {
    const buffer = await downloadFromOSS(ossKey)
    const basePath = ossKey.replace(/\/original\.\w+$/, '')

    const [sizes, exif] = await Promise.all([
      generateSizes(buffer, basePath),
      extractExif(buffer),
    ])

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
        status: 'READY',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await prisma.photo.update({
      where: { id: photoId },
      data: { status: 'FAILED', processingError: message },
    })
  }
}
