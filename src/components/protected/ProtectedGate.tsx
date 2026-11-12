// The role guard of the older person's phone (/protected).
//
// A Server Component (runs only on the server): requirePageRole() checks the login
// and the role BEFORE the call check is sent to the browser. A phone that is not
// paired (or was removed) goes to /svarzhi, any other role to /403. It replaces the
// temporary RoleGate for this area (no "temporary page" note any more).

import type { ReactNode } from "react";
import { ROUTES } from "@/config/routes";
import { Skeleton } from "@/components/ui/Skeleton";
import { bg } from "@/i18n/bg";
import { requirePageRole } from "@/server/auth/requireRole";

export async function ProtectedGate({ children }: { children: ReactNode }) {
  await requirePageRole(["protected"], ROUTES.pair);
  return <>{children}</>;
}

// Shown while the role check runs (it reads the login cookie, so with Cache
// Components it must sit inside <Suspense>; this is its fallback).
export function ProtectedLoading() {
  return (
    <main className="call-check shell flex max-w-2xl flex-col gap-5 py-6 md:py-12">
      <p role="status" className="sr-only">
        {bg.common.loading}
      </p>
      {/* The shapes of the big button and the second button. */}
      <Skeleton className="min-h-[38svh] w-full rounded-lg" />
      <Skeleton className="mt-4 h-16 w-full rounded-md" />
    </main>
  );
}
