// The frame of the admin area: one <main> in the page column ("shell") with the spacing
// of the page recipe, like the moderator area. Used by AdminGate (the real /admin) and
// by the test preview (/dev/admin).

import type { ReactNode } from "react";

export function AdminFrame({ children }: { children: ReactNode }) {
  return <main className="shell py-10 md:py-16">{children}</main>;
}
