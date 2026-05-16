import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withAuth } from '@/lib/api-middleware'
import { processPhoto } from '@/lib/pipeline/process-photo'
import { resolveAlbumCover } from '@/lib/covers/album-cover'
import { Prisma } from '../../../../../../prisma/generated/prisma/client'
import type { PhotoStatus } from '../../../../../../prisma/generated/prisma/enums'

const TAG = 'photos'

export const GET = withAuth(async (req, { coupleUser }) => {
  const url = new URL(req.url)
  const albumId = url.searchParams.get('albumId')
  const status = url.searchParams.get('status')
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '20')

  const where = {
    album: { coupleId: coupleUser.coupleId },
    ...(albumId && { albumId }),
    ...(status && { status: status as PhotoStatus }),
  }

  try {
    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.photo.count({ where }),
    ])

    let album: { coverMode: 'AUTO' | 'MANUAL'; coverPhotoId: string | null } | null = null

    if (albumId) {
      try {
        album = await prisma.album.findFirst({
          where: { id: albumId, coupleId: coupleUser.coupleId },
          select: { coverMode: true, coverPhotoId: true },
        })
      } catch (error) {
        // Backward compatibility: older DBs may not have cover fields yet.
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          logger.warn(TAG, 'Album cover metadata unavailable; fallback without cover metadata', {
            coupleId: coupleUser.coupleId,
            albumId,
            code: error.code,
          })
        } else {
          logger.warn(TAG, 'Album cover metadata query failed; fallback without cover metadata', {
            coupleId: coupleUser.coupleId,
            albumId,
          })
        }
        album = null
      }
    }

    const resolvedCover = album
      ? resolveAlbumCover({
          coverMode: album.coverMode,
          coverPhotoId: album.coverPhotoId,
          photos: photos.map(photo => ({
            id: photo.id,
            status: photo.status,
            displayUrl: photo.displayUrl,
            sortOrder: photo.sortOrder,
          })),
        })
      : null

    return NextResponse.json({
      photos: photos.map(photo => ({
        ...photo,
        isAlbumCover: resolvedCover?.photoId === photo.id,
        canBeCover: photo.status === 'READY' && Boolean(photo.displayUrl),
      })),
      total,
      page,
      limit,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error(TAG, '获取照片列表失败', {
      coupleId: coupleUser.coupleId,
      albumId,
      status,
      page,
      limit,
      error: message,
    })
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
  }
})

export const POST = withAuth(async (req, { coupleUser }) => {
  const { ossKey, fileName, fileSize, albumId, exif } = await req.json()
  logger.info(TAG, '创建照片记录', { coupleId: coupleUser.coupleId, albumId, fileName })

  const album = await prisma.album.findFirst({
    where: { id: albumId, coupleId: coupleUser.coupleId },
    select: {
      id: true,
      photos: {
        select: { sortOrder: true },
        orderBy: [{ sortOrder: 'desc' }],
        take: 1,
      },
    },
  })
  if (!album) {
    logger.warn(TAG, '相册不存在', { albumId, coupleId: coupleUser.coupleId })
    return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  }

  const cdnDomain = process.env.OSS_CDN_DOMAIN || ''
  const photo = await prisma.photo.create({
    data: {
      albumId,
      originalUrl: `https://${cdnDomain}/${ossKey}`,
      fileName,
      fileSize,
      sortOrder: (album.photos[0]?.sortOrder ?? 0) + 1,
      status: 'PROCESSING',
    },
  })

  processPhoto(photo.id, ossKey, exif || null)
  logger.info(TAG, '照片处理已触发', { photoId: photo.id })

  return NextResponse.json({ id: photo.id, status: 'PROCESSING' }, { status: 201 })
})
