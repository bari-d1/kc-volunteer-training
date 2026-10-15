import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-session";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return guardAdmin(request);
  }
  return updateSession(request);
}

/** /admin/** needs a valid admin cookie, except the login page itself. */
async function guardAdmin(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = await verifyAdminToken(
    request.cookies.get(ADMIN_COOKIE)?.value,
  );

  if (pathname === "/admin/login") {
    return signedIn
      ? NextResponse.redirect(new URL("/admin", request.url))
      : NextResponse.next();
  }
  if (!signedIn) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except static files, images and metadata routes.
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
