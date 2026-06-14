import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/api/auth/login"];
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith("/api/auth/login"));

  // Check for session cookie
  const sessionCookie = request.cookies.get("cloud_session");

  // Redirect to login if accessing protected route without session
  if (!isPublicRoute && !sessionCookie?.value) {
    // Allow API routes to return 401 instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect to dashboard if accessing login with session
  if (pathname === "/login" && sessionCookie?.value) {
    return NextResponse.redirect(new URL("/drive", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth/login).*)",
  ],
};
