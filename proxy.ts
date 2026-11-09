import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Signed-in visitors are sent to their dashboard from these.
const GUEST_ONLY = ["/", "/register", "/forgot-password"]
// Reachable either way (the temporary-password flow happens before sign-in).
const PUBLIC_PATHS = [...GUEST_ONLY, "/change-password"]

/** Roles from the access token, for routing only. The API verifies the token. */
function rolesFrom(token: string | undefined): string[] {
  if (!token) return []
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    const payload = JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=")))
    return Array.isArray(payload.roles) ? payload.roles : []
  } catch {
    return []
  }
}

/**
 * Runs before any page renders, so signed-out visitors never see a flash of a
 * private screen and signed-in visitors skip the sign-in page. This is a cheap
 * presence check; every API call still verifies the session.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const access = request.cookies.get("access_token")?.value
  const signedIn = !!access || request.cookies.has("refresh_token")

  if (!signedIn && !PUBLIC_PATHS.includes(pathname)) {
    const url = new URL("/", request.url)
    url.searchParams.set("next", pathname + search)
    return NextResponse.redirect(url)
  }

  if (signedIn && GUEST_ONLY.includes(pathname)) {
    const home = rolesFrom(access).includes("ADMIN") ? "/admin/dashboard" : "/dashboard"
    return NextResponse.redirect(new URL(home, request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Skip the API proxy, Next internals, files with an extension, and the
  // generated share images (crawlers fetch those signed out).
  matcher: ["/((?!api|_next/static|_next/image|.*opengraph-image.*|.*\\.[a-z0-9]+$).*)"],
}
