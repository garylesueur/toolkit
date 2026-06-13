import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Forwards the pathname to server components (e.g. tool breadcrumb JSON-LD)
 * without making tool layouts client-rendered.
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/tools/:path*"],
};
