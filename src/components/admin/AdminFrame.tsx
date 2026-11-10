// The frame of the admin area: one <main> with the same spacing as the family and
// moderator areas, a little wider for the charts. Used by AdminGate (the real /admin)
// and by the test preview (/dev/admin).

import type { ReactNode } from "react";

export function AdminFrame({ children }: { children: ReactNode }) {
  return <main className="family admin">{children}</main>;
}
