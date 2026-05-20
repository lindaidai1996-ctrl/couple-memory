import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  buildAssetUrl,
  generateAvatarOSSKey,
  generateSignedPutUrl,
  generateSignedPutUrlForKey,
} from '@/lib/oss'

const TAG = 'upload/sign'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
const AVATAR_SIGN_PURPOSE = 'avatar'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { fileName, fileType, fileSize, purpose } = await req.json()
  logger.info(TAG, '签名请求', { userId: session.user.id, fileName, fileType, fileSize, purpose })

  if (!fileName || !fileType || !fileSize) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (fileSize > MAX_FILE_SIZE) {
    logger.warn(TAG, '文件过大', { fileName, fileSize })
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 })
  }

  if (!ALLOWED_TYPES.includes(fileType)) {
    logger.warn(TAG, '不支持的文件类型', { fileName, fileType })
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 })
  }

  try {
    const publicHost = process.env.OSS_CDN_DOMAIN || `${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com`

    if (purpose === AVATAR_SIGN_PURPOSE) {
      const coupleUser = await prisma.coupleUser.findFirst({
        where: { userId: session.user.id },
      })
      if (!coupleUser) {
        return NextResponse.json({ error: 'No couple space found' }, { status: 400 })
      }

      const avatarKey = generateAvatarOSSKey(coupleUser.coupleId, session.user.id, fileName)
      const result = generateSignedPutUrlForKey(avatarKey, fileType)
      logger.info(TAG, '头像签名成功', { userId: session.user.id, coupleId: coupleUser.coupleId, fileName })
      return NextResponse.json({
        ...result,
        assetUrl: buildAssetUrl(publicHost, result.ossKey),
      })
    }

    const coupleUser = await prisma.coupleUser.findFirst({
      where: { userId: session.user.id },
    })
    if (!coupleUser) {
      return NextResponse.json({ error: 'No couple space found' }, { status: 400 })
    }

    const result = generateSignedPutUrl(coupleUser.coupleId, fileName, fileType)
    logger.info(TAG, '签名成功', { coupleId: coupleUser.coupleId, fileName })
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload sign failed'
    logger.error(TAG, 'OSS签名失败', { error: message, fileName })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
