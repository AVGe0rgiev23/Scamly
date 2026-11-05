// The frame of every family page: one <main> with the same width and spacing.
// Who is logged in and „Изход“ are in the site header (SiteHeader), not here.
// Used by FamilyGate (the real /family pages) and by the test previews (/dev/family).

import type { ReactNode } from "react";

export function FamilyFrame({ children }: { children: ReactNode }) {
  return <main className="family">{children}</main>;
}
