import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const POST = withAuth(async (req, { coupleUser }, params) => {
  const photo = await prisma.photo.findFirst({
    where: {
      id: params.photoId,
      album: { coupleId: coupleUser.coupleId },
      status: 'FAILED',
    },
  })
  if (!photo) {
    return NextResponse.json({ error: 'Not found or not failed' }, { status: 404 })
  }

  await prisma.photo.update({
    where: { id: params.photoId },
    data: { status: 'PROCESSING', processingError: null },
  })

  return NextResponse.json({ status: 'PROCESSING' })
})
