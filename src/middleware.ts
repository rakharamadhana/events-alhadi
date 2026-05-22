// =============================================================================
// src/middleware.ts — Edge Middleware for Route Protection
// =============================================================================
// Protects routes using Auth.js v5 middleware integration.
// - /admin/* routes require ADMIN role
// - /events/* is browseable publicly; buying remains protected by server actions
// - /reservations/*, /profile require APPROVED user status
// - /login, /register, /api/cron/* are public
// =============================================================================

import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  // -------------------------------------------------------------------------
  // Public routes — always accessible
  // -------------------------------------------------------------------------
  const publicPaths = [
    "/events",
    "/login",
    "/register",
    "/api/auth",
    "/api/cron",
  ];
  if (
    pathname === "/" ||
    publicPaths.some((path) => pathname.startsWith(path))
  ) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // -------------------------------------------------------------------------
  // Unauthenticated users → redirect to login
  // -------------------------------------------------------------------------
  if (!user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // -------------------------------------------------------------------------
  // Admin routes — require ADMIN role
  // -------------------------------------------------------------------------
  if (pathname.startsWith("/admin")) {
    if (user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
  }

  // -------------------------------------------------------------------------
  // Protected user routes — require APPROVED status
  // -------------------------------------------------------------------------
  if (pathname.startsWith("/reservations") || pathname.startsWith("/profile")) {
    if (user.status !== "APPROVED") {
      return NextResponse.redirect(new URL("/pending", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
