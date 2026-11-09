// The frame of every moderator page: one <main> with the same width and spacing as
// the family area. Used by ModeratorGate (the real /moderator pages) and by the test
// previews (/dev/moderator).

import type { ReactNode } from "react";

export function ModeratorFrame({ children }: { children: ReactNode }) {
  return <main className="family moderator">{children}</main>;
}
