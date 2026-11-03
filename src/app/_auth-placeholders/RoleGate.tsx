// TEMPORARY frame for the logged-in areas (/family, /moderator, /admin, /protected).
//
// A Server Component (runs only on the server): it checks the role with
// requirePageRole() BEFORE anything of the area is shown. A guest is sent to the
// login (or pairing) page, a wrong role to /403. The page itself (children) is shown
// only after the check passed. Roberta designs the real areas later (Session F, W2).

import type { ReactNode } from "react";
import type { AppRole } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { requirePageRole } from "@/server/auth/requireRole";
import { LogoutButton } from "@/components/auth/forms";

type RoleGateProps = {
  allowedRoles: AppRole[];
  loginPage: string; // where a guest goes
  showLogout: boolean; // the older person's phone never logs out by itself
  children: ReactNode;
};

export async function RoleGate(props: RoleGateProps) {
  const actor = await requirePageRole(props.allowedRoles, props.loginPage);
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-16">
      {props.children}
      <p className="text-lg">
        {bg.auth.signedInAs} {actor.profile.display_name}
      </p>
      <p className="text-base">{bg.areas.placeholderNote}</p>
      {props.showLogout ? (
        <div>
          <LogoutButton />
        </div>
      ) : null}
    </main>
  );
}

// Shown while the role check runs. The check reads the login cookie, so with Cache
// Components it must sit inside <Suspense>; this is its fallback.
export function AreaLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <p className="text-lg">{bg.common.loading}</p>
    </main>
  );
}
