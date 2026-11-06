// GET /offline: the offline card (task W2-09). The service worker (public/sw.js) saves
// this page when it is installed and shows it whenever a page can't load because
// there is no internet. The HTML is built in src/lib/offlinePage.ts.
//
// It uses no request data, so Next.js builds it once at `next build` (static), and it
// is the same for everybody: no login, no names, nothing private.

import { offlinePageHtml } from "@/lib/offlinePage";

export function GET() {
  return new Response(offlinePageHtml(), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
