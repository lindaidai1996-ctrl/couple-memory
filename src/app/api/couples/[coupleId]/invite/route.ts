import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'
import crypto from 'crypto'

export const POST = withAuth(
  async (req, { coupleUser }) => {
    const inviteCode = crypto.randomBytes(6).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await prisma.couple.update({
      where: { id: coupleUser.coupleId },
      data: {
        inviteCode,
        inviteExpiresAt: expiresAt,
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    return NextResponse.json(
      {
        inviteCode,
        inviteUrl: `${baseUrl}/invite/${inviteCode}`,
        expiresAt,
      },
      { status: 201 }
    )
  },
  { requiredRole: 'OWNER' }
)

export const GET = withAuth(
  async (req, { coupleUser }) => {
    const couple = await prisma.couple.findUnique({
      where: { id: coupleUser.coupleId },
      select: { inviteCode: true, inviteExpiresAt: true },
    })

    if (!couple?.inviteCode || !couple.inviteExpiresAt) {
      return NextResponse.json({ inviteCode: null })
    }

    if (couple.inviteExpiresAt < new Date()) {
      return NextResponse.json({ inviteCode: null, expired: true })
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    return NextResponse.json({
      inviteCode: couple.inviteCode,
      inviteUrl: `${baseUrl}/invite/${couple.inviteCode}`,
      expiresAt: couple.inviteExpiresAt,
    })
  },
  { requiredRole: 'OWNER' }
)
