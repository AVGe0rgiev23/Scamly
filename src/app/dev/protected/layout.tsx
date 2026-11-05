// /dev/protected: preview of the older person's call check WITHOUT the role guard,
// for the browser tests (tests/e2e/protected.spec.ts), like /dev/family.
//
// Why this is safe: the page contains no data. Everything comes from our API in the
// browser, and the API checks the phone's login and role on every request. Without a
// paired phone it answers 401, so nothing is created or shown. The tests replace the
// API answers with page.route(). The real page is /protected, behind ProtectedGate.

import type { Metadata } from "next";
import type { ReactNode } from "react";

// Search engines should not list test pages.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ProtectedPreviewLayout({ children }: { children: ReactNode }) {
  return children;
}
