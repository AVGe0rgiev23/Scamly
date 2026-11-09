// /dev/moderator/*: preview pages of the moderator area WITHOUT the role guard, for
// the browser tests (tests/e2e/scripts.spec.ts), like /dev/family.
//
// Why this is safe: these pages contain no data. Everything comes from our API in the
// browser, and the API checks the login and the role (moderator or admin) on every
// request, and RLS checks every row. Without a login it answers 401 and the page
// shows that Bulgarian error. The tests replace the API answers with page.route().
// The real pages are /moderator/*, behind ModeratorGate.

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ModeratorFrame } from "@/components/moderator/ModeratorFrame";

// Search engines should not list test pages.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ModeratorPreviewLayout({ children }: { children: ReactNode }) {
  return <ModeratorFrame>{children}</ModeratorFrame>;
}
