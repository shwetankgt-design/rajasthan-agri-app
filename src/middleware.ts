import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

// Lightweight edge guard: presence-check only (full validation happens in
// server components / route handlers via getCurrentUser). Redirect unauthenticated
// browser navigation to /login.
// /trace is the public, no-login QR-code-style consumer traceability page
// (FR-M7-09) — deliberately outside auth, unlike every other route.
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/trace"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  if (isPublic) return NextResponse.next();
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }
  if (!hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
