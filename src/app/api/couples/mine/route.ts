import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

const TAG = 'couples/mine'

type SessionLike = {
  user?: {
    id?: string | null
  } | null
} | null

type MineRouteDeps = {
  auth: () => Promise<SessionLike>
  prisma: {
    coupleUser: {
      findFirst?: (args: Record<string, unknown>) => Promise<{
        couple: Record<string, unknown>
      } | null>
    }
  }
  logger: Pick<typeof logger, 'warn'>
}

export function createMineGetHandler(
  deps: MineRouteDeps = {
    auth: auth as () => Promise<SessionLike>,
    prisma: prisma as unknown as MineRouteDeps['prisma'],
    logger,
  }
) {
  return async function GET() {
    const session = await deps.auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const coupleUser = await deps.prisma.coupleUser.findFirst!({
      where: { userId: session.user.id },
      include: { couple: true },
    })

    if (!coupleUser) {
      deps.logger.warn(TAG, '用户无关联空间', { userId: session.user.id })
      return NextResponse.json({ error: 'No couple found' }, { status: 404 })
    }

    return NextResponse.json(coupleUser.couple)
  }
}

export const GET = createMineGetHandler()
