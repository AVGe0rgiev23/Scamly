// The frame of every family page: one <main> with the page column of the design
// system (`shell`: 1200 px at most, 16 / 32 px gutter) and the same spacing.
// Who is logged in and „Изход“ are in the site header (SiteHeader), not here.
// Used by FamilyGate (the real /family pages) and by the test previews (/dev/family).

import type { ReactNode } from "react";

export function FamilyFrame({ children }: { children: ReactNode }) {
  return <main className="shell py-10 md:py-16">{children}</main>;
}
