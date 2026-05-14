import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const PATCH = withAuth(async (req, { coupleUser }, params) => {
  const body = await req.json()
  const ms = await prisma.milestone.updateMany({
    where: { id: params.milestoneId, coupleId: coupleUser.coupleId },
    data: body,
  })
  if (ms.count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const updated = await prisma.milestone.findUnique({ where: { id: params.milestoneId } })
  return NextResponse.json(updated)
})

export const DELETE = withAuth(async (req, { coupleUser }, params) => {
  await prisma.milestone.deleteMany({
    where: { id: params.milestoneId, coupleId: coupleUser.coupleId },
  })
  return new Response(null, { status: 204 })
})
