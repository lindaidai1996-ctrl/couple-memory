import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const TAG = 'invite/accept'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { code } = await params
  logger.info(TAG, '接受邀请', { userId: session.user.id, code })

  const couple = await prisma.couple.findUnique({
    where: { inviteCode: code },
  })

  if (!couple) {
    logger.warn(TAG, '无效邀请码', { code })
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  if (couple.inviteExpiresAt && couple.inviteExpiresAt < new Date()) {
    logger.warn(TAG, '邀请码已过期', { code, expiredAt: couple.inviteExpiresAt.toISOString() })
    return NextResponse.json(
      { error: 'Invite code expired' },
      { status: 410 }
    )
  }

  const existing = await prisma.coupleUser.findFirst({
    where: { userId: session.user.id, coupleId: couple.id },
  })
  if (existing) {
    logger.warn(TAG, '已经是成员', { userId: session.user.id, coupleId: couple.id })
    return NextResponse.json({ error: 'Already a member' }, { status: 409 })
  }

  const memberCount = await prisma.coupleUser.count({
    where: { coupleId: couple.id },
  })
  if (memberCount >= 2) {
    logger.warn(TAG, '空间已满', { coupleId: couple.id })
    return NextResponse.json({ error: 'Space is full' }, { status: 409 })
  }

  await prisma.coupleUser.create({
    data: {
      userId: session.user.id,
      coupleId: couple.id,
      role: 'PARTNER',
    },
  })

  await prisma.couple.update({
    where: { id: couple.id },
    data: { inviteCode: null, inviteExpiresAt: null },
  })

  logger.info(TAG, '加入成功', { userId: session.user.id, coupleId: couple.id })
  return NextResponse.json({
    coupleId: couple.id,
    coupleName: couple.name,
    role: 'PARTNER',
  })
}
