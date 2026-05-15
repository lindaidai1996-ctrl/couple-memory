import sharp from 'sharp'
import { uploadToOSS } from '@/lib/oss'

export type ImageSizes = {
  thumbnailPath: string
  displayPath: string
  width: number | undefined
  height: number | undefined
}

export async function generateSizes(buffer: Buffer, basePath: string): Promise<ImageSizes> {
  const [thumbnail, display, metadata] = await Promise.all([
    sharp(buffer)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer(),

    sharp(buffer)
      .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer(),

    sharp(buffer).metadata(),
  ])

  const thumbnailPath = `${basePath}/thumbnail.jpg`
  const displayPath = `${basePath}/display.jpg`

  await Promise.all([
    uploadToOSS(thumbnailPath, thumbnail),
    uploadToOSS(displayPath, display),
  ])

  return {
    thumbnailPath,
    displayPath,
    width: metadata.width,
    height: metadata.height,
  }
}
