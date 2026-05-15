import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user

  const isAuthPage = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register")
  const isProtected = nextUrl.pathname.startsWith("/dashboard") ||
                      nextUrl.pathname.startsWith("/albums") ||
                      nextUrl.pathname.startsWith("/settings") ||
                      nextUrl.pathname.startsWith("/timeline")
  const isPublic = nextUrl.pathname === "/" ||
                   nextUrl.pathname.startsWith("/s/") ||
                   nextUrl.pathname.startsWith("/api/health")

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images).*)",
  ],
}
