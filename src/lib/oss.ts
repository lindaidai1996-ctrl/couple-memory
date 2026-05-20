import crypto from 'crypto'

export function generateOSSKey(coupleId: string, fileName: string): string {
  const uuid = crypto.randomUUID()
  const ext = fileName.split('.').pop() || 'jpg'
  return `couples/${coupleId}/photos/${uuid}/original.${ext}`
}

export function generateAvatarOSSKey(coupleId: string, userId: string, fileName: string): string {
  const uuid = crypto.randomUUID()
  const ext = fileName.split('.').pop() || 'jpg'
  return `couples/${coupleId}/avatars/${userId}/${uuid}/original.${ext}`
}

export function buildAssetUrl(cdnDomain: string, ossKey: string): string {
  return `https://${cdnDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/${ossKey}`
}

function signOSSRequest(
  method: string,
  ossKey: string,
  contentType = ''
): { url: string; headers: Record<string, string> } {
  const bucket = process.env.OSS_BUCKET!
  const region = process.env.OSS_REGION!
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID!
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET!

  const date = new Date().toUTCString()
  const resource = `/${bucket}/${ossKey}`
  const stringToSign = `${method}\n\n${contentType}\n${date}\n${resource}`

  const signature = crypto
    .createHmac('sha1', accessKeySecret)
    .update(stringToSign)
    .digest('base64')

  return {
    url: `https://${bucket}.${region}.aliyuncs.com/${ossKey}`,
    headers: {
      Date: date,
      Authorization: `OSS ${accessKeyId}:${signature}`,
      ...(contentType && { 'Content-Type': contentType }),
    },
  }
}

// --- 预签名 URL（前端上传用） ---

export function generateSignedPutUrl(
  coupleId: string,
  fileName: string,
  contentType: string
): { ossKey: string; signedUrl: string } {
  const ossKey = generateOSSKey(coupleId, fileName)
  return generateSignedPutUrlForKey(ossKey, contentType)
}

export function generateSignedPutUrlForKey(
  ossKey: string,
  contentType: string
): { ossKey: string; signedUrl: string } {
  const bucket = process.env.OSS_BUCKET!
  const region = process.env.OSS_REGION!
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID!
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET!

  const expires = Math.floor(Date.now() / 1000) + 900
  const resource = `/${bucket}/${ossKey}`
  const stringToSign = `PUT\n\n${contentType}\n${expires}\n${resource}`

  const signature = crypto
    .createHmac('sha1', accessKeySecret)
    .update(stringToSign)
    .digest('base64')

  const encodedSig = encodeURIComponent(signature)
  const signedUrl = `https://${bucket}.${region}.aliyuncs.com/${ossKey}?OSSAccessKeyId=${accessKeyId}&Expires=${expires}&Signature=${encodedSig}`

  return { ossKey, signedUrl }
}

// --- 服务端直接操作 OSS（AK 签名） ---

export async function downloadFromOSS(ossKey: string): Promise<Buffer> {
  const { url, headers } = signOSSRequest('GET', ossKey)
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`OSS download failed: ${res.status}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function uploadToOSS(
  ossKey: string,
  buffer: Buffer,
  contentType = 'image/jpeg'
): Promise<void> {
  const { url, headers } = signOSSRequest('PUT', ossKey, contentType)
  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: new Uint8Array(buffer),
  })
  if (!res.ok) throw new Error(`OSS upload failed: ${res.status}`)
}
