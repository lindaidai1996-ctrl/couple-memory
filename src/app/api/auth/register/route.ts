import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const { email, password, name } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
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

  return NextResponse.json(
    { user: { id: user.id, email, name }, couple },
    { status: 201 }
  )
}
