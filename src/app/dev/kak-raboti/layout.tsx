// /dev/kak-raboti/*: preview pages of the education cards for the browser tests
// (tests/e2e/scripts.spec.ts), like /dev/family. They contain no data: the cards come
// from GET /api/scripts in the browser, which shows only PUBLISHED cards to anybody.
// The real pages are /kak-raboti and /kak-raboti/<slug> (rendered on the server).

import type { Metadata } from "next";
import type { ReactNode } from "react";

// Search engines should not list test pages.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function EducationPreviewLayout({ children }: { children: ReactNode }) {
  return children;
}
