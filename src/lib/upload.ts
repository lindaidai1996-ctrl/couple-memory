import imageCompression from 'browser-image-compression'
import exifr from 'exifr'

const MAX_ORIGINAL_SIZE = 10 * 1024 * 1024

const COMPRESS_OPTIONS = {
  maxSizeMB: 5,
  maxWidthOrHeight: 4096,
  useWebWorker: true,
  preserveExif: true,
  fileType: 'image/jpeg' as const,
}

export type UploadStage = 'compressing' | 'uploading' | 'confirming'
type UploadPurpose = 'photo' | 'avatar'

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

async function extractExifFromFile(file: File): Promise<ClientExifData | null> {
  try {
    const exif = await exifr.parse(file, {
      pick: [
        'DateTimeOriginal', 'GPSLatitude', 'GPSLongitude',
        'Make', 'Model', 'FocalLength', 'FNumber',
        'ExposureTime', 'ISO',
      ],
    })
    if (!exif) return null

    return {
      takenAt: exif.DateTimeOriginal ? new Date(exif.DateTimeOriginal).toISOString() : null,
      latitude: exif.GPSLatitude || null,
      longitude: exif.GPSLongitude || null,
      cameraMake: exif.Make || null,
      cameraModel: exif.Model || null,
      focalLength: exif.FocalLength ? `${exif.FocalLength}mm` : null,
      aperture: exif.FNumber ? `f/${exif.FNumber}` : null,
      shutterSpeed: exif.ExposureTime
        ? exif.ExposureTime < 1
          ? `1/${Math.round(1 / exif.ExposureTime)}s`
          : `${exif.ExposureTime}s`
        : null,
      iso: exif.ISO || null,
    }
  } catch {
    return null
  }
}

export async function compressAndUpload(
  file: File,
  coupleId: string,
  albumId: string,
  onProgress?: (stage: UploadStage, percent: number) => void
) {
  if (file.size > MAX_ORIGINAL_SIZE) {
    throw new Error(`文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），最大支持 10MB`)
  }

  onProgress?.('compressing', 0)
  const [compressed, exifData] = await Promise.all([
    compressImage(file),
    extractExifFromFile(file),
  ])
  onProgress?.('compressing', 100)

  const { ossKey } = await signAndUploadCompressedFile(file.name, compressed, 'photo', onProgress)

  onProgress?.('confirming', 0)
  const confirmRes = await fetch(`/api/couples/${coupleId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ossKey,
      fileName: file.name,
      fileSize: compressed.size,
      albumId,
      exif: exifData,
    }),
  })
  if (!confirmRes.ok) throw new Error('Failed to confirm upload')
  onProgress?.('confirming', 100)

  return confirmRes.json()
}

export async function compressAndUploadAvatar(
  file: File,
  onProgress?: (stage: UploadStage, percent: number) => void
) {
  if (file.size > MAX_ORIGINAL_SIZE) {
    throw new Error(`文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），最大支持 10MB`)
  }

  onProgress?.('compressing', 0)
  const compressed = await compressImage(file)
  onProgress?.('compressing', 100)

  const { assetUrl } = await signAndUploadCompressedFile(file.name, compressed, 'avatar', onProgress)
  if (!assetUrl) throw new Error('Failed to resolve avatar URL')

  onProgress?.('confirming', 0)
  onProgress?.('confirming', 100)

  return { avatarUrl: assetUrl }
}

async function signAndUploadCompressedFile(
  fileName: string,
  compressed: File,
  purpose: UploadPurpose,
  onProgress?: (stage: UploadStage, percent: number) => void
) {
  onProgress?.('uploading', 0)
  const signRes = await fetch('/api/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName,
      fileType: 'image/jpeg',
      fileSize: compressed.size,
      purpose,
    }),
  })
  if (!signRes.ok) {
    const err = await signRes.json()
    throw new Error(err.error || 'Failed to get upload signature')
  }

  const { ossKey, signedUrl, assetUrl } = await signRes.json()

  const uploadRes = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: compressed,
  })
  if (!uploadRes.ok) throw new Error('Failed to upload to OSS')
  onProgress?.('uploading', 100)

  return {
    ossKey: String(ossKey),
    assetUrl: typeof assetUrl === 'string' ? assetUrl : null,
  }
}

async function compressImage(file: File): Promise<File> {
  try {
    return await imageCompression(file, COMPRESS_OPTIONS)
  } catch {
    try {
      return await imageCompression(file, { ...COMPRESS_OPTIONS, preserveExif: false })
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      throw new Error(`图片压缩失败: ${detail}`)
    }
  }
}
