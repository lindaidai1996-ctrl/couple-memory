import imageCompression from 'browser-image-compression'

const COMPRESS_OPTIONS = {
  maxSizeMB: 5,
  maxWidthOrHeight: 4096,
  useWebWorker: true,
  preserveExif: true,
  fileType: 'image/jpeg' as const,
}

export type UploadStage = 'compressing' | 'uploading' | 'confirming'

export async function compressAndUpload(
  file: File,
  coupleId: string,
  albumId: string,
  onProgress?: (stage: UploadStage, percent: number) => void
) {
  onProgress?.('compressing', 0)
  const compressed = await imageCompression(file, COMPRESS_OPTIONS)
  onProgress?.('compressing', 100)

  onProgress?.('uploading', 0)
  const signRes = await fetch('/api/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileType: 'image/jpeg',
      fileSize: compressed.size,
    }),
  })
  if (!signRes.ok) {
    const err = await signRes.json()
    throw new Error(err.error || 'Failed to get upload signature')
  }
  const { ossKey, bucket, region, credentials } = await signRes.json()

  const uploadUrl = `https://${bucket}.${region}.aliyuncs.com/${ossKey}`
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/jpeg',
      'x-oss-security-token': credentials.securityToken,
    },
    body: compressed,
  })
  if (!uploadRes.ok) throw new Error('Failed to upload to OSS')
  onProgress?.('uploading', 100)

  onProgress?.('confirming', 0)
  const confirmRes = await fetch(`/api/couples/${coupleId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ossKey, fileName: file.name, fileSize: compressed.size, albumId }),
  })
  if (!confirmRes.ok) throw new Error('Failed to confirm upload')
  onProgress?.('confirming', 100)

  return confirmRes.json()
}
