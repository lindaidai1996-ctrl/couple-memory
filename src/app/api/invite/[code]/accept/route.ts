import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { code } = await params

  const couple = await prisma.couple.findUnique({
    where: { inviteCode: code },
  })

  if (!couple) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  if (couple.inviteExpiresAt && couple.inviteExpiresAt < new Date()) {
    return NextResponse.json(
      { error: 'Invite code expired' },
      { status: 410 }
    )
  }

  // Check if already a member
  const existing = await prisma.coupleUser.findFirst({
    where: { userId: session.user.id, coupleId: couple.id },
  })
  if (existing) {
    return NextResponse.json({ error: 'Already a member' }, { status: 409 })
  }

  // Check if couple already has 2 members
  const memberCount = await prisma.coupleUser.count({
    where: { coupleId: couple.id },
  })
  if (memberCount >= 2) {
    return NextResponse.json({ error: 'Space is full' }, { status: 409 })
  }

  // Join as PARTNER
  await prisma.coupleUser.create({
    data: {
      userId: session.user.id,
      coupleId: couple.id,
      role: 'PARTNER',
    },
  })

  // Clear invite code after use
  await prisma.couple.update({
    where: { id: couple.id },
    data: { inviteCode: null, inviteExpiresAt: null },
  })

  return NextResponse.json({
    coupleId: couple.id,
    coupleName: couple.name,
    role: 'PARTNER',
  })
}
