import exifr from 'exifr'

export type ExifData = {
  takenAt: Date | null
  latitude: number | null
  longitude: number | null
  cameraMake: string | null
  cameraModel: string | null
  focalLength: string | null
  aperture: string | null
  shutterSpeed: string | null
  iso: number | null
}

export async function extractExif(buffer: Buffer): Promise<ExifData | null> {
  const exif = await exifr.parse(buffer, {
    pick: [
      'DateTimeOriginal', 'GPSLatitude', 'GPSLongitude',
      'Make', 'Model', 'FocalLength', 'FNumber',
      'ExposureTime', 'ISO',
    ],
  })
  if (!exif) return null

  return {
    takenAt: exif.DateTimeOriginal || null,
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
}
