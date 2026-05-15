import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const coupleUser = await prisma.coupleUser.findFirst({
    where: { userId: session.user.id },
    include: { couple: true },
  })

  if (!coupleUser) {
    return NextResponse.json({ error: 'No couple found' }, { status: 404 })
  }

  return NextResponse.json(coupleUser.couple)
}
