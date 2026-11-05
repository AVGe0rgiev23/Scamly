// Layout of /protected: only for role(s) ["protected"]. Checked on the server before the page
// is shown (RoleGate); the proxy has already sent guests away.
// TEMPORARY plain version; designed later by Roberta.

import { Suspense, type ReactNode } from "react";
import { ROUTES } from "@/config/routes";
import { AreaLoading, RoleGate } from "../_auth-placeholders/RoleGate";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AreaLoading />}>
      <RoleGate allowedRoles={["protected"]} loginPage={ROUTES.pair}>
        {children}
      </RoleGate>
    </Suspense>
  );
}
