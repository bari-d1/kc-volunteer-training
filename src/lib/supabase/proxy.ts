import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

/** Paths that need a signed-in volunteer. */
function isProtected(pathname: string) {
  return (
    pathname === "/onboarding" ||
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/course" ||
    pathname.startsWith("/course/")
  );
}

/**
 * Refreshes the Supabase session cookie on every request and sends signed-out
 * visitors on protected paths to /sign-in?next=<path>.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // Stops CDNs caching a response that carries someone's session.
        Object.entries(headers).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });

  // Don't run code between createServerClient and getClaims: getClaims
  // validates the token and triggers the refresh that writes cookies.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && isProtected(pathname)) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/sign-in";
    signIn.search = `?next=${encodeURIComponent(pathname + search)}`;
    return withSessionCookies(NextResponse.redirect(signIn), response);
  }

  // Signed-in volunteers skip the landing and sign-in pages.
  if (signedIn && (pathname === "/" || pathname === "/sign-in")) {
    const course = request.nextUrl.clone();
    course.pathname = "/course";
    course.search = "";
    return withSessionCookies(NextResponse.redirect(course), response);
  }

  return response;
}

/** Carries refreshed cookies and no-cache headers over to a new response. */
function withSessionCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);
    if (value) target.headers.set(header, value);
  }
  return target;
}
