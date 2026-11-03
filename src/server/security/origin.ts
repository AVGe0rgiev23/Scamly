// Same-origin check for every request that changes something (CSRF protection).
//
// The attack (CSRF): a bad web site makes YOUR browser send a POST to Scamly. The
// browser adds your Scamly cookies, so without a check the request would run as you.
//
// The defence: browsers say where a request comes from, in headers that JavaScript
// can't fake:
//   Sec-Fetch-Site: "same-origin" (our own page), "same-site", "cross-site", or
//                   "none" (typed into the address bar / bookmark)
//   Origin:         "https://scamly.example" (the site that started the request)
// We accept a non-GET request only when it comes from our own site. The rule order
// is the same as in Go's net/http CrossOriginProtection:
//   1. Sec-Fetch-Site present -> allow only "same-origin" or "none"
//   2. otherwise, Origin present -> its host must equal our Host header
//   3. neither header -> not a browser (curl, a server script); CSRF needs a
//      browser with cookies, so this is allowed
// GET/HEAD/OPTIONS never change anything in our API, so they are not checked.

import { ApiError } from "@/server/http/errors";
import { bg } from "@/i18n/bg";

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

export function isSameOrigin(request: Request): boolean {
  if (SAFE_METHODS.includes(request.method.toUpperCase())) {
    return true;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null) {
    return fetchSite === "same-origin" || fetchSite === "none";
  }

  const origin = request.headers.get("origin");
  if (origin === null) {
    return true;
  }

  const host = request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    // "Origin: null" or garbage: not our site.
    return false;
  }
}

// Throws 403 when the request comes from another site. Step 0 of every non-GET route.
export function assertSameOrigin(request: Request): void {
  if (!isSameOrigin(request)) {
    throw new ApiError(403, "bad_origin", bg.errors.badOrigin);
  }
}
