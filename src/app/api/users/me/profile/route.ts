import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const profileSelect = {
  id: true,
  email: true,
  name: true,
  avatar: true,
} as const

type SessionLike = {
  user?: {
    id?: string | null
  } | null
} | null

type ProfileRecord = {
  id: string
  email: string
  name: string | null
  avatar: string | null
}

type ProfileRouteDeps = {
  auth: () => Promise<SessionLike>
  prisma: {
    user: {
      findUnique?: (args: {
        where: { id: string }
        select: typeof profileSelect
      }) => Promise<ProfileRecord | null>
      update?: (args: {
        where: { id: string }
        data: { avatar: string | null }
        select: typeof profileSelect
      }) => Promise<ProfileRecord>
    }
  }
}

function normalizeAvatarInput(avatar: unknown) {
  if (avatar === null) return null
  if (typeof avatar !== 'string') return undefined

  const trimmed = avatar.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function createProfileGetHandler(
  deps: ProfileRouteDeps = {
    auth: auth as () => Promise<SessionLike>,
    prisma: prisma as unknown as ProfileRouteDeps['prisma'],
  }
) {
  return async function GET() {
    const session = await deps.auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await deps.prisma.user.findUnique!({
      where: { id: session.user.id },
      select: profileSelect,
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  }
}

export function createProfilePatchHandler(
  deps: ProfileRouteDeps = {
    auth: auth as () => Promise<SessionLike>,
    prisma: prisma as unknown as ProfileRouteDeps['prisma'],
  }
) {
  return async function PATCH(req: Request) {
    const session = await deps.auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    if (!body || typeof body !== 'object' || !('avatar' in body)) {
      return NextResponse.json({ error: 'avatar is required' }, { status: 400 })
    }

    const avatar = normalizeAvatarInput(body?.avatar)
    if (avatar === undefined) {
      return NextResponse.json({ error: 'Invalid avatar' }, { status: 400 })
    }

    const updated = await deps.prisma.user.update!({
      where: { id: session.user.id },
      data: { avatar },
      select: profileSelect,
    })

    return NextResponse.json(updated)
  }
}

export const GET = createProfileGetHandler()
export const PATCH = createProfilePatchHandler()
