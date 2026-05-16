import { NextResponse } from 'next/server'

import { logger } from '@/lib/logger'

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
  deps?: Partial<MineRouteDeps>
) {
  return async function GET() {
    const auth = deps?.auth ?? await loadAuth()
    const prisma = deps?.prisma ?? await loadPrisma()
    const routeLogger = deps?.logger ?? logger

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const coupleUser = await prisma.coupleUser.findFirst!({
      where: { userId: session.user.id },
      include: { couple: true },
    })

    if (!coupleUser) {
      routeLogger.warn(TAG, '用户无关联空间', { userId: session.user.id })
      return NextResponse.json({ error: 'No couple found' }, { status: 404 })
    }

    return NextResponse.json(coupleUser.couple)
  }
}

async function loadAuth() {
  const { auth } = await import('@/lib/auth')
  return auth as () => Promise<SessionLike>
}

async function loadPrisma() {
  const { prisma } = await import('@/lib/prisma')
  return prisma as unknown as MineRouteDeps['prisma']
}

export const GET = createMineGetHandler()
