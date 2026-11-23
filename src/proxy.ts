import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "anl_session";

function getSecretKey(): Uint8Array | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = getSecretKey();

  let signedIn = false;
  if (token && secret) {
    try {
      await jwtVerify(token, secret);
      signedIn = true;
    } catch {
      signedIn = false;
    }
  }

  // The login page decides whether a signed-in visitor goes to the dashboard,
  // using the database-backed session. This proxy only checks the JWT, so
  // redirecting /login here would trap anyone whose account was deactivated or
  // renamed: they would bounce between /dashboard and /login forever. Let the
  // page render the form when the cookie is stale; signing in replaces it.
  if (pathname === "/login") {
    return NextResponse.next();
  }

  if (!signedIn) {
    // The landing page, the join form, receipt downloads, the per-member /pay
    // pages and the forgotten-password code flow are the public face of the
    // library, so those are the paths a signed out visitor is allowed to see.
    // Receipts and pay pages are addressed by unguessable tokens, so they stay
    // private even though their routes need no session. Everything else needs
    // one. (/login is handled above because its page checks the session itself.)
    if (
      pathname === "/" ||
      pathname === "/join" ||
      pathname === "/forgot-password" ||
      pathname === "/support" ||
      pathname === "/developer" ||
      pathname === "/opengraph-image" ||
      pathname === "/twitter-image" ||
      pathname.startsWith("/receipts/") ||
      pathname.startsWith("/pay/")
    ) {
      return NextResponse.next();
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    if (!token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)"],
};