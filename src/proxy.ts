// The proxy (Next.js 16's new name for "middleware"): runs on the server BEFORE every
// page and API request.
//
// It does two things:
//   1. Refreshes the login session. The access token in the cookie lives about one
//      hour; when it is old, @supabase/ssr swaps the refresh token for a new pair and
//      we write the new cookies on the response. So a paired phone stays logged in
//      without ever seeing a login screen (BUILD_PLAN section 5).
//   2. Sends logged-out visitors away from the private areas: /family, /moderator
//      and /admin go to /vhod (login), /protected goes to /svarzhi (pairing).
//
// What it does NOT do: check roles. That needs a database query, and the proxy runs
// on every request (also prefetches). Roles are checked in server code
// (src/server/auth/requireRole.ts) in each page layout and API route, which is also
// where the Next.js docs say the real checks belong.
//
// Pattern from the @supabase/ssr guide for Next.js, adapted to the proxy file name.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { loginPageFor } from "@/config/routes";
import { readPublicEnv } from "@/lib/publicEnv";
import { AUTH_COOKIE_OPTIONS } from "@/server/supabase/cookieOptions";
import type { Database } from "@/types/database";

export async function proxy(request: NextRequest) {
  // "Continue to the page", passing the request on. `let`, because it is replaced
  // when the session cookies change (see setAll below).
  let response = NextResponse.next({ request });

  let loggedIn = false;
  const env = readPublicEnv();
  // Without Supabase settings (e.g. in CI) nobody can be logged in; public pages
  // still work.
  if (env !== null) {
    const supabase = createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // New tokens: put them on the request (so the page rendered now already sees
        // them) and on the response (so the browser stores them).
        setAll(cookiesToSet, headers) {
          for (const cookie of cookiesToSet) {
            request.cookies.set(cookie.name, cookie.value);
          }
          response = NextResponse.next({ request });
          for (const cookie of cookiesToSet) {
            response.cookies.set(cookie.name, cookie.value, cookie.options);
          }
          // "Don't cache this response": it carries someone's session.
          for (const [name, value] of Object.entries(headers)) {
            response.headers.set(name, value);
          }
        },
      },
    });

    // getClaims() checks the signature of the access token (and refreshes it when
    // it has expired). It does not query our database.
    const { data } = await supabase.auth.getClaims();
    loggedIn = Boolean(data?.claims);
  }

  const loginPage = loginPageFor(request.nextUrl.pathname);
  if (loginPage !== null && !loggedIn) {
    const redirect = NextResponse.redirect(new URL(loginPage, request.url));
    // Keep any cookie changes (e.g. an expired session being cleared).
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  return response;
}

export const config = {
  // Run on every path except Next.js's own files and images (they need no session).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
