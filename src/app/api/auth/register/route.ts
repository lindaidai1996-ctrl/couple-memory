import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

import { getDefaultAvatarPath } from '@/lib/default-avatar'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

const TAG = 'auth/register'

type RegisterRouteDeps = {
  hashPassword: (password: string) => Promise<string>
  now: () => number
  prisma: {
    user: {
      findUnique: (args: { where: { email: string } }) => Promise<unknown>
      create: (args: {
        data: {
          email: string
          passwordHash: string
          name: string
          avatar: string
          couples: {
            create: {
              role: 'OWNER'
              couple: {
                create: {
                  slug: string
                  name: string
                }
              }
            }
          }
        }
        include: { couples: { include: { couple: true } } }
      }) => Promise<{
        id: string
        email: string
        name: string
        avatar: string
        couples: Array<{
          couple: {
            id: string
            slug: string
            name: string
          }
        }>
      }>
    }
  }
  logger: Pick<typeof logger, 'info' | 'warn' | 'error'>
}

export function createRegisterHandler(deps?: Partial<RegisterRouteDeps>) {
  const routeLogger = deps?.logger ?? logger
  const routePrisma = deps?.prisma ?? prisma
  const hashPassword = deps?.hashPassword ?? (async (password: string) => bcrypt.hash(password, 12))
  const now = deps?.now ?? Date.now

  return async function POST(req: Request) {
    try {
      const { email, password, name } = await req.json()
      const normalizedEmail = typeof email === 'string' ? email.trim() : ''
      const normalizedName = typeof name === 'string' ? name.trim() : ''

      routeLogger.info(TAG, '注册请求', { email: normalizedEmail, name: normalizedName })

      if (!normalizedEmail || !password) {
        routeLogger.warn(TAG, '缺少必填字段', { email: normalizedEmail })
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      }

      const existing = await routePrisma.user.findUnique({ where: { email: normalizedEmail } })
      if (existing) {
        routeLogger.warn(TAG, '邮箱已注册', { email: normalizedEmail })
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        )
      }

      const passwordHash = await hashPassword(password)
      const slug = `couple-${now().toString(36)}`
      const avatar = getDefaultAvatarPath(normalizedEmail)

      const user = await routePrisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name: normalizedName,
          avatar,
          couples: {
            create: {
              role: 'OWNER',
              couple: {
                create: {
                  slug,
                  name: normalizedName ? `${normalizedName}的空间` : '我们的空间',
                },
              },
            },
          },
        },
        include: { couples: { include: { couple: true } } },
      })

      const couple = user.couples[0].couple
      routeLogger.info(TAG, '注册成功', { userId: user.id, coupleId: couple.id })

      return NextResponse.json(
        {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
          },
          couple,
        },
        { status: 201 }
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      routeLogger.error(TAG, '注册异常', { error: message })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

export const POST = createRegisterHandler()
