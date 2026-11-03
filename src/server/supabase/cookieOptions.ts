// Settings for the login cookies that @supabase/ssr writes (access + refresh token).
//
// Used by the user client (src/server/supabase/userClient.ts) and by the proxy
// (src/proxy.ts), so both write the cookies in exactly the same way.
// No "server-only" import here: the proxy can't load that marker package.
//
//   httpOnly: true  -> JavaScript in the browser can't read the tokens, so an XSS bug
//                      can't steal a session (BUILD_PLAN R9: cookies set by the server).
//   secure          -> sent only over HTTPS. Off in `npm run dev`, which runs on
//                      plain http://localhost.
//   sameSite: lax   -> the browser doesn't send them with requests started by other
//                      sites (except normal link clicks), which also helps against CSRF.

import type { CookieOptionsWithName } from "@supabase/ssr";

export const AUTH_COOKIE_OPTIONS: CookieOptionsWithName = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};
