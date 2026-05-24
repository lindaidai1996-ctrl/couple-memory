import { NextResponse } from 'next/server'

import { withAuth } from '@/lib/api-middleware'
import { getStyleMemoryProfileByCoupleId } from '@/lib/style-memory'

type StyleMemoryAccessContext = {
  coupleUser: {
    coupleId: string
  }
}

type StyleMemoryRouteDeps = {
  getStyleMemoryProfileByCoupleId?: (coupleId: string) => ReturnType<typeof getStyleMemoryProfileByCoupleId>
}

export function createStyleMemoryGetHandler(
  deps?: StyleMemoryRouteDeps
) {
  return async function GET(
    _req: Request,
    { coupleUser }: StyleMemoryAccessContext
  ) {
    const resolver = deps?.getStyleMemoryProfileByCoupleId ?? await loadStyleMemoryResolver()
    const profile = await resolver(coupleUser.coupleId)

    return NextResponse.json({ profile })
  }
}

async function loadPrisma() {
  const { prisma } = await import('@/lib/prisma')
  return prisma
}

async function loadStyleMemoryResolver() {
  const prisma = await loadPrisma()
  return (coupleId: string) => getStyleMemoryProfileByCoupleId(prisma as never, coupleId)
}

const styleMemoryGetHandler = createStyleMemoryGetHandler()

export const GET = withAuth((req, ctx) => styleMemoryGetHandler(req, ctx))
