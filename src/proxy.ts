import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (Next.js 16 convention, replaces middleware.ts).
 *
 * Protects /api/admin routes with a shared secret.
 * The /admin page itself renders a client-side login gate
 * that sets the `admin-token` cookie for subsequent API calls.
 *
 * The admin token can be sent via the `x-admin-token` header
 * or the `admin-token` cookie.
 *
 * Set ADMIN_SECRET in your .env to enable authentication.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect API routes — the admin page has a client-side auth gate
  if (pathname.startsWith("/api/admin")) {
    const adminSecret = process.env.ADMIN_SECRET;

    // Fail-closed: if ADMIN_SECRET is not configured, deny all access
    if (!adminSecret) {
      return NextResponse.json(
        { error: "Admin access is not configured. Set ADMIN_SECRET in .env." },
        { status: 503 }
      );
    }

    const token =
      request.headers.get("x-admin-token") ??
      request.cookies.get("admin-token")?.value;

    if (token !== adminSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*"],
};
