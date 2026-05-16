import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import authConfig from "./auth.config"
import { logger } from "./logger"

const TAG = "auth/login"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          logger.warn(TAG, "缺少登录凭证")
          return null
        }

        const email = credentials.email as string
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
          logger.warn(TAG, "用户不存在", { email })
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!isValid) {
          logger.warn(TAG, "密码错误", { email })
          return null
        }

        logger.info(TAG, "登录成功", { userId: user.id, email })
        return { id: user.id, email: user.email, name: user.name, image: user.avatar }
      },
    }),
  ],
})
