// The role guard of the family area (/family and every page inside it).
//
// A Server Component (runs only on the server): requirePageRole() checks the login
// and the role BEFORE anything of the area is sent to the browser. A guest goes to
// /vhod, any other role to /403. The proxy has already sent guests away; this is the
// real check (it asks Supabase Auth and reads the role from the database).

import type { ReactNode } from "react";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { requirePageRole } from "@/server/auth/requireRole";
import { FamilyFrame } from "./FamilyFrame";

// The name and „Изход“ are shown by the site header (SiteHeader), for every area.
export async function FamilyGate({ children }: { children: ReactNode }) {
  await requirePageRole(["family"], ROUTES.login);
  return <FamilyFrame>{children}</FamilyFrame>;
}

// Shown while the role check runs (it reads the login cookie, so with Cache
// Components it must sit inside <Suspense>; this is its fallback).
export function FamilyLoading() {
  return (
    <FamilyFrame>
      <p role="status" className="muted">
        {bg.common.loading}
      </p>
    </FamilyFrame>
  );
}
