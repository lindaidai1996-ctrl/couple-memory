import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const couple = await prisma.couple.findUnique({
    where: { inviteCode: code },
    include: {
      members: {
        where: { role: 'OWNER' },
        include: { user: { select: { name: true, avatar: true } } },
      },
    },
  })

  if (!couple) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  if (couple.inviteExpiresAt && couple.inviteExpiresAt < new Date()) {
    return NextResponse.json(
      {
        error: 'Invite expired',
        coupleName: couple.name,
      },
      { status: 410 }
    )
  }

  const owner = couple.members[0]?.user
  const memberCount = await prisma.coupleUser.count({
    where: { coupleId: couple.id },
  })

  return NextResponse.json({
    coupleName: couple.name,
    ownerName: owner?.name ?? null,
    ownerAvatar: owner?.avatar ?? null,
    expiresAt: couple.inviteExpiresAt?.toISOString() ?? null,
    memberCount,
  })
}
