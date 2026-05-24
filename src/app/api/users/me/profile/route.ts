import { NextResponse } from 'next/server'
import { createApiErrorResponse, createRequestId } from '@/lib/api-error'

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
        data: {
          avatar?: string | null
          name?: string | null
        }
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

function normalizeNameInput(name: unknown) {
  if (name === null) return null
  if (typeof name !== 'string') return undefined

  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function loadAuth() {
  const { auth } = await import('@/lib/auth')
  return auth as () => Promise<SessionLike>
}

async function loadPrisma() {
  const { prisma } = await import('@/lib/prisma')
  return prisma as unknown as ProfileRouteDeps['prisma']
}

export function createProfileGetHandler(
  deps?: Partial<ProfileRouteDeps>
) {
  return async function GET() {
    const requestId = createRequestId()
    const auth = deps?.auth ?? await loadAuth()
    const prisma = deps?.prisma ?? await loadPrisma()
    const session = await auth()
    if (!session?.user?.id) {
      return createApiErrorResponse(401, 'UNAUTHORIZED', 'Unauthorized', false, requestId)
    }

    const user = await prisma.user.findUnique!({
      where: { id: session.user.id },
      select: profileSelect,
    })

    if (!user) {
      return createApiErrorResponse(404, 'USER_NOT_FOUND', 'User not found', false, requestId)
    }

    return NextResponse.json(user)
  }
}

export function createProfilePatchHandler(
  deps?: Partial<ProfileRouteDeps>
) {
  return async function PATCH(req: Request) {
    const requestId = createRequestId()
    const auth = deps?.auth ?? await loadAuth()
    const prisma = deps?.prisma ?? await loadPrisma()
    const session = await auth()
    if (!session?.user?.id) {
      return createApiErrorResponse(401, 'UNAUTHORIZED', 'Unauthorized', false, requestId)
    }

    const body = await req.json()
    if (!body || typeof body !== 'object') {
      return createApiErrorResponse(400, 'PROFILE_UPDATE_REQUIRED', 'name or avatar is required', false, requestId)
    }

    const nextData: {
      avatar?: string | null
      name?: string | null
    } = {}

    if ('avatar' in body) {
      const avatar = normalizeAvatarInput(body?.avatar)
      if (avatar === undefined) {
        return createApiErrorResponse(400, 'INVALID_AVATAR', 'Invalid avatar', false, requestId)
      }
      nextData.avatar = avatar
    }

    if ('name' in body) {
      const name = normalizeNameInput(body?.name)
      if (name === undefined) {
        return createApiErrorResponse(400, 'INVALID_NAME', 'Invalid name', false, requestId)
      }
      nextData.name = name
    }

    if (Object.keys(nextData).length === 0) {
      return createApiErrorResponse(400, 'PROFILE_UPDATE_REQUIRED', 'name or avatar is required', false, requestId)
    }

    const updated = await prisma.user.update!({
      where: { id: session.user.id },
      data: nextData,
      select: profileSelect,
    })

    return NextResponse.json(updated)
  }
}

export const GET = createProfileGetHandler()
export const PATCH = createProfilePatchHandler()
