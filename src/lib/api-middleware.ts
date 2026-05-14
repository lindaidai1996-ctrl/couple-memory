import { auth } from './auth'
import { prisma } from './prisma'
import { NextResponse } from 'next/server'
import type { CoupleUser, Couple, Role } from '../../prisma/generated/prisma/client'

export type AuthContext = {
  userId: string
  coupleUser: CoupleUser & { couple: Couple }
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
    const session = await auth()
    if (!session?.user?.id) {
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (options?.requiredRole === 'OWNER' && coupleUser.role !== 'OWNER') {
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
    ctx: { couple: Couple },
    params: Record<string, string>
  ) => Promise<Response>
) {
  return async (
    req: Request,
    { params }: { params: Promise<Record<string, string>> }
  ) => {
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
