// The role guard of the moderator area (/moderator and every page inside it):
// moderators and admins only (an admin can do everything a moderator can).
//
// A Server Component: requirePageRole() checks the login and the role BEFORE anything
// of the area is sent to the browser. A guest goes to /vhod, any other role to /403.
// The API checks the role again on every request, and RLS a third time.

import type { ReactNode } from "react";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { requirePageRole } from "@/server/auth/requireRole";
import { ModeratorFrame } from "./ModeratorFrame";

export async function ModeratorGate({ children }: { children: ReactNode }) {
  await requirePageRole(["moderator", "admin"], ROUTES.login);
  return <ModeratorFrame>{children}</ModeratorFrame>;
}

// Shown while the role check runs (it reads the login cookie, so with Cache
// Components it must sit inside <Suspense>; this is its fallback).
export function ModeratorLoading() {
  return (
    <ModeratorFrame>
      <p role="status" className="muted">
        {bg.common.loading}
      </p>
    </ModeratorFrame>
  );
}
