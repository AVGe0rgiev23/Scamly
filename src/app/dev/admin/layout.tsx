// /dev/admin: preview of the admin panel WITHOUT the role guard, for the browser tests
// (tests/e2e/admin.spec.ts), like /dev/moderator.
//
// Why this is safe: the page contains no data. Everything comes from /api/admin/* in
// the browser, and the API checks the login and the admin role on every request, and
// RLS checks every row. Without an admin login the API answers 401 / 403 and the page
// shows that Bulgarian error. The tests replace the API answers with page.route().

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminFrame } from "@/components/admin/AdminFrame";

// Search engines should not list test pages.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminPreviewLayout({ children }: { children: ReactNode }) {
  return <AdminFrame>{children}</AdminFrame>;
}
