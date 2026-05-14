import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'
import type { PhotoStatus } from '../../../../../../../../prisma/generated/prisma/enums'

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

  const [photos, total] = await Promise.all([
    prisma.photo.findMany({
      where,
      orderBy: { takenAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.photo.count({ where }),
  ])

  return NextResponse.json({ photos, total, page, limit })
})

export const POST = withAuth(async (req, { coupleUser }) => {
  const { ossKey, fileName, fileSize, albumId } = await req.json()

  const album = await prisma.album.findFirst({
    where: { id: albumId, coupleId: coupleUser.coupleId },
  })
  if (!album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  }

  const cdnDomain = process.env.OSS_CDN_DOMAIN || ''
  const photo = await prisma.photo.create({
    data: {
      albumId,
      originalUrl: `https://${cdnDomain}/${ossKey}`,
      fileName,
      fileSize,
      status: 'PROCESSING',
    },
  })

  return NextResponse.json({ id: photo.id, status: 'PROCESSING' }, { status: 201 })
})
