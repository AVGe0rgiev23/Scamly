// The site's public address, for links we send outside the app (alert e-mails).
//
// The order of choice:
//   1. SITE_URL, if we set it (e.g. https://scamly.vercel.app)
//   2. VERCEL_PROJECT_PRODUCTION_URL, which Vercel sets by itself on every
//      deployment (only the host name, so we add "https://")
//   3. http://localhost:3000 on a computer (`npm run dev`)
// The result never ends with "/", so we can write `${siteUrl}/family/alerts`.

import type { ServerEnv } from "@/lib/env";

export const LOCAL_SITE_URL = "http://localhost:3000";

export function getSiteUrl(env: ServerEnv): string {
  let url = LOCAL_SITE_URL;
  if (env.SITE_URL !== undefined) {
    url = env.SITE_URL;
  } else if (env.VERCEL_PROJECT_PRODUCTION_URL !== undefined) {
    url = `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return url.replace(/\/+$/, ""); // remove every "/" at the end
}
