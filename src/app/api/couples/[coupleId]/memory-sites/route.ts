import { NextResponse } from 'next/server'

import { withAuth, type AuthContext } from '@/lib/api-middleware'
import { mapMemorySite, type MemorySiteRecord } from '@/lib/memory-sites/site-mappers'
import { prisma } from '@/lib/prisma'

type ListRouteDeps = {
  prismaClient?: {
    memorySite: {
      findMany: (args: Record<string, unknown>) => Promise<MemorySiteRecord[]>
    }
  }
}

async function loadPrismaClient() {
  return prisma as unknown as NonNullable<ListRouteDeps['prismaClient']>
}

export function createListMemorySitesHandler(deps: ListRouteDeps = {}) {
  return async (_req: Request, { coupleUser }: AuthContext) => {
    const prismaClient = deps.prismaClient ?? await loadPrismaClient()
    const sites = await prismaClient.memorySite.findMany({
      where: { coupleId: coupleUser.coupleId },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    })

    return NextResponse.json({
      sites: sites.map(mapMemorySite),
    })
  }
}

export const GET = withAuth(createListMemorySitesHandler())
