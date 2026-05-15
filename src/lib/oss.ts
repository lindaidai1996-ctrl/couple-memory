import crypto from 'crypto'

export function generateOSSKey(coupleId: string, fileName: string): string {
  const uuid = crypto.randomUUID()
  const ext = fileName.split('.').pop() || 'jpg'
  return `couples/${coupleId}/photos/${uuid}/original.${ext}`
}

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/~/g, '%7E')
}

function buildStsSignature(params: Record<string, string>, accessKeySecret: string): string {
  const sortedKeys = Object.keys(params).sort()
  const canonicalized = sortedKeys.map(k => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&')
  const stringToSign = `GET&${percentEncode('/')}&${percentEncode(canonicalized)}`
  const hmac = crypto.createHmac('sha1', accessKeySecret + '&')
  return hmac.update(stringToSign).digest('base64')
}

export async function getSTSCredentials(coupleId: string, fileName: string) {
  const ossKey = generateOSSKey(coupleId, fileName)
  const bucket = process.env.OSS_BUCKET!
  const region = process.env.OSS_REGION!
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID!
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET!
  const roleArn = process.env.OSS_ROLE_ARN!

  const params: Record<string, string> = {
    Action: 'AssumeRole',
    Version: '2015-04-01',
    Format: 'JSON',
    AccessKeyId: accessKeyId,
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: crypto.randomUUID(),
    Timestamp: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    RoleArn: roleArn,
    RoleSessionName: `upload-${coupleId.slice(0, 8)}`,
    DurationSeconds: '900',
    Policy: JSON.stringify({
      Version: '1',
      Statement: [{
        Effect: 'Allow',
        Action: ['oss:PutObject'],
        Resource: [`acs:oss:*:*:${bucket}/${ossKey}`],
      }],
    }),
  }

  params.Signature = buildStsSignature(params, accessKeySecret)

  const query = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  const res = await fetch(`https://sts.aliyuncs.com/?${query}`)
  const data = await res.json()

  if (!data.Credentials) {
    throw new Error(`STS failed: ${data.Message || 'Unknown error'}`)
  }

  return {
    ossKey,
    bucket,
    region,
    credentials: {
      accessKeyId: data.Credentials.AccessKeyId,
      accessKeySecret: data.Credentials.AccessKeySecret,
      securityToken: data.Credentials.SecurityToken,
      expiration: data.Credentials.Expiration,
    },
  }
}

export async function downloadFromOSS(ossKey: string): Promise<Buffer> {
  const bucket = process.env.OSS_BUCKET!
  const region = process.env.OSS_REGION!
  const url = `https://${bucket}.${region}.aliyuncs.com/${ossKey}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSS download failed: ${res.status}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function uploadToOSS(ossKey: string, buffer: Buffer, contentType = 'image/jpeg'): Promise<void> {
  const bucket = process.env.OSS_BUCKET!
  const region = process.env.OSS_REGION!
  const url = `https://${bucket}.${region}.aliyuncs.com/${ossKey}`
  const res = await fetch(url, {
    method: 'PUT',
    body: new Uint8Array(buffer),
    headers: { 'Content-Type': contentType },
  })
  if (!res.ok) throw new Error(`OSS upload failed: ${res.status}`)
}
