// The frame of every family page: one <main> with the same width and spacing.
// `account` is the „Влезли сте като …“ line with the logout button (from FamilyGate);
// the test preview pages (/dev/family) pass nothing there.

import type { ReactNode } from "react";

export function FamilyFrame({ account, children }: { account?: ReactNode; children: ReactNode }) {
  return (
    <main className="family">
      {account}
      {children}
    </main>
  );
}
