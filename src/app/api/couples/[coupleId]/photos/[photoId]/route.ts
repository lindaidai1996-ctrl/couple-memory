import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const PATCH = withAuth(async (req, { coupleUser }, params) => {
  const body = await req.json()
  const photo = await prisma.photo.findFirst({
    where: { id: params.photoId, album: { coupleId: coupleUser.coupleId } },
  })
  if (!photo) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.photo.update({
    where: { id: params.photoId },
    data: body,
  })
  return NextResponse.json(updated)
})

export const DELETE = withAuth(async (req, { coupleUser }, params) => {
  const photo = await prisma.photo.findFirst({
    where: { id: params.photoId, album: { coupleId: coupleUser.coupleId } },
  })
  if (!photo) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.photo.delete({ where: { id: params.photoId } })
  return new Response(null, { status: 204 })
})
