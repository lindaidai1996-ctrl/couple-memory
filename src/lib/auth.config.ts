import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"

declare module "next-auth" {
  interface Session {
    user: { id: string; email: string; name?: string | null; avatar?: string | null }
  }
}

export default {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // authorize 在这里留空，实际逻辑在 auth.ts 中覆盖
      authorize: () => null,
    }),
  ],
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      if (typeof token.picture === 'string') session.user.avatar = token.picture
      return session
    },
    authorized({ auth }) {
      return !!auth
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig
