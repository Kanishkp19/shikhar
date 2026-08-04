import { type NextRequest, NextResponse } from "next/server";

/**
 * Middleware — no auth required for single-user personal deployment.
 * All routes pass through freely.
 */
export async function middleware(request: NextRequest) {
  // Redirect /login to home — no login needed
  if (request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
