// TEMPORARY frame for the logged-in areas (/family, /moderator, /admin, /protected).
//
// A Server Component (runs only on the server): it checks the role with
// requirePageRole() BEFORE anything of the area is shown. A guest is sent to the
// login (or pairing) page, a wrong role to /403. The page itself (children) is shown
// only after the check passed. Who is logged in and „Изход“ are in the site header
// (SiteHeader). Roberta designs the real areas later (Session F, W2).

import type { ReactNode } from "react";
import type { AppRole } from "@/config/routes";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { bg } from "@/i18n/bg";
import { requirePageRole } from "@/server/auth/requireRole";

type RoleGateProps = {
  allowedRoles: AppRole[];
  loginPage: string; // where a guest goes
  children: ReactNode;
};

export async function RoleGate(props: RoleGateProps) {
  await requirePageRole(props.allowedRoles, props.loginPage);
  return (
    <main className="shell flex flex-1 flex-col gap-6 py-10 md:py-16">
      {props.children}
      <p className="max-w-[60ch] border-t border-line pt-4 text-sm text-fg-muted">
        {bg.areas.placeholderNote}
      </p>
    </main>
  );
}

// Shown while the role check runs. The check reads the login cookie, so with Cache
// Components it must sit inside <Suspense>; this is its fallback.
export function AreaLoading() {
  return (
    <main className="shell flex-1 py-10 md:py-16">
      <p role="status" className="sr-only">
        {bg.common.loading}
      </p>
      <Skeleton className="mb-6 h-14 w-2/3 max-w-xl" />
      <SkeletonText lines={3} className="max-w-xl" />
    </main>
  );
}
