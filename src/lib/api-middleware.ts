import { logger } from './logger'
import { NextResponse } from 'next/server'

type Role = 'OWNER' | 'PARTNER'

type SessionLike = {
  user?: {
    id?: string | null
  } | null
} | null

type CoupleRecord = {
  id: string
  name: string
  slug: string
  startDate: Date | null
  coverPhotoUrl: string | null
  bio: string | null
  theme: string
  isPublic: boolean
}

type CoupleUserRecord = {
  role: Role
  coupleId: string
  couple: CoupleRecord
}

type PrismaLike = {
  coupleUser: {
    findFirst: (args: Record<string, unknown>) => Promise<CoupleUserRecord | null>
  }
  couple: {
    findUnique: (args: Record<string, unknown>) => Promise<CoupleRecord | null>
  }
}

export type AuthContext = {
  userId: string
  coupleUser: CoupleUserRecord
}

const TAG = 'middleware/auth'

async function loadAuth() {
  const { auth } = await import('./auth')
  return auth as () => Promise<SessionLike>
}

async function loadPrisma() {
  const { prisma } = await import('./prisma')
  return prisma as unknown as PrismaLike
}

/**
 * 需要登录 + coupleId 权限校验的路由中间件
 */
export function withAuth(
  handler: (
    req: Request,
    ctx: AuthContext,
    params: Record<string, string>
  ) => Promise<Response>,
  options?: { requiredRole?: Role }
) {
  return async (
    req: Request,
    { params }: { params: Promise<Record<string, string>> }
  ) => {
    const [auth, prisma] = await Promise.all([loadAuth(), loadPrisma()])
    const session = await auth()
    if (!session?.user?.id) {
      logger.warn(TAG, '未登录访问', { url: req.url })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const coupleId = resolvedParams.coupleId
    if (!coupleId) {
      return NextResponse.json({ error: 'Missing coupleId' }, { status: 400 })
    }

    const coupleUser = await prisma.coupleUser.findFirst({
      where: { userId: session.user.id, coupleId },
      include: { couple: true },
    })
    if (!coupleUser) {
      logger.warn(TAG, '无权访问', { userId: session.user.id, coupleId })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (options?.requiredRole === 'OWNER' && coupleUser.role !== 'OWNER') {
      logger.warn(TAG, '需要OWNER权限', { userId: session.user.id, coupleId, role: coupleUser.role })
      return NextResponse.json(
        { error: 'Owner access required' },
        { status: 403 }
      )
    }

    return handler(req, { userId: session.user.id, coupleUser }, resolvedParams)
  }
}

/**
 * 公开访问路由中间件（通过 slug 查找公开的 couple）
 */
export function withPublicAccess(
  handler: (
    req: Request,
    ctx: { couple: CoupleRecord },
    params: Record<string, string>
  ) => Promise<Response>
) {
  return async (
    req: Request,
    { params }: { params: Promise<Record<string, string>> }
  ) => {
    const prisma = await loadPrisma()
    const resolvedParams = await params
    const couple = await prisma.couple.findUnique({
      where: { slug: resolvedParams.slug },
    })
    if (!couple || !couple.isPublic) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return handler(req, { couple }, resolvedParams)
  }
}
