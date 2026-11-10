// The role guard of the admin area (/admin): admins only (W3-06).
//
// A Server Component: requirePageRole() checks the login and the role BEFORE anything
// of the area is sent to the browser. A guest goes to /vhod, any other role to /403.
// The API checks the role again on every request, and RLS a third time.

import type { ReactNode } from "react";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { requirePageRole } from "@/server/auth/requireRole";
import { AdminFrame } from "./AdminFrame";

export async function AdminGate({ children }: { children: ReactNode }) {
  await requirePageRole(["admin"], ROUTES.login);
  return <AdminFrame>{children}</AdminFrame>;
}

// Shown while the role check runs (it reads the login cookie, so with Cache
// Components it must sit inside <Suspense>; this is its fallback).
export function AdminLoading() {
  return (
    <AdminFrame>
      <p role="status" className="muted">
        {bg.common.loading}
      </p>
    </AdminFrame>
  );
}
