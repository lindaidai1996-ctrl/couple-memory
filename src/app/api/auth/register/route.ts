import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

const TAG = "auth/register"

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()
    logger.info(TAG, "注册请求", { email, name })

    if (!email || !password) {
      logger.warn(TAG, "缺少必填字段", { email })
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      logger.warn(TAG, "邮箱已注册", { email })
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const slug = `couple-${Date.now().toString(36)}`

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        couples: {
          create: {
            role: "OWNER",
            couple: {
              create: { slug, name: name ? `${name}的空间` : "我们的空间" },
            },
          },
        },
      },
      include: { couples: { include: { couple: true } } },
    })

    const couple = user.couples[0].couple
    logger.info(TAG, "注册成功", { userId: user.id, coupleId: couple.id })

    return NextResponse.json(
      { user: { id: user.id, email, name }, couple },
      { status: 201 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    logger.error(TAG, "注册异常", { error: message })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
