import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(req: NextRequest) {
  const session =
    req.cookies.get("next-auth.session-token") ??
    req.cookies.get("__Secure-next-auth.session-token")

  const isLoginPage = req.nextUrl.pathname === "/login"
  const isPublic = req.nextUrl.pathname.startsWith("/api/auth")

  if (isPublic) return NextResponse.next()

  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}