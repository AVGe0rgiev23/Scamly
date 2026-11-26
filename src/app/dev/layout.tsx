// /dev/*: the preview pages for the browser tests (tests/e2e/) and the style guide.
// They show the screens WITHOUT the login and role guards, so they must not exist on
// the live site (D35). Every page under /dev passes through this one layout:
//
//   SCAMLY_DEV_PAGES=1 → the pages work (set by playwright.config.ts and CI)
//   not set            → every /dev page answers 404 „Страницата не е намерена“
//
// The variable is read when the page is rendered. `next build` pre-renders these
// pages, so the build and the server must see the same value; Playwright sets it for
// both (`npm run build && npm run start`). Vercel never sets it.

import type { ReactNode } from "react";
import { notFound } from "next/navigation";

export default function DevLayout({ children }: { children: ReactNode }) {
  // Only the exact value "1" switches the test pages on.
  if (process.env.SCAMLY_DEV_PAGES !== "1") {
    // Throws, like `raise` in Python: Next.js shows the 404 page instead.
    notFound();
  }
  return children;
}
