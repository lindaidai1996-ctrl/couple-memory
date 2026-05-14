import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const PATCH = withAuth(async (req, { coupleUser }, params) => {
  const body = await req.json()
  const album = await prisma.album.updateMany({
    where: { id: params.albumId, coupleId: coupleUser.coupleId },
    data: body,
  })
  if (album.count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const updated = await prisma.album.findUnique({ where: { id: params.albumId } })
  return NextResponse.json(updated)
})

export const DELETE = withAuth(
  async (req, { coupleUser }, params) => {
    await prisma.album.deleteMany({
      where: { id: params.albumId, coupleId: coupleUser.coupleId },
    })
    return new Response(null, { status: 204 })
  },
  { requiredRole: 'OWNER' }
)
