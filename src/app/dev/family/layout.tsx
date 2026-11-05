// /dev/family/*: preview pages of the family dashboard WITHOUT the role guard, for the
// browser tests (tests/e2e/family.spec.ts), like /dev/ui for the design system.
//
// Why this is safe: these pages contain no data. Everything they show comes from our
// API in the browser, and the API checks the login, the role and the owner on every
// request (and RLS checks every row). Without a login it answers 401 and the page
// shows that Bulgarian error. The tests replace the API answers with page.route().
// The real pages are /family/*, behind FamilyGate.

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FamilyFrame } from "@/components/family/FamilyFrame";

// Search engines should not list test pages.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function FamilyPreviewLayout({ children }: { children: ReactNode }) {
  return <FamilyFrame>{children}</FamilyFrame>;
}
