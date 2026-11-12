// The frame of every moderator page: one <main> in the page column ("shell") with the
// spacing of the page recipe. Used by ModeratorGate (the real /moderator pages) and by
// the test previews (/dev/moderator).

import type { ReactNode } from "react";

export function ModeratorFrame({ children }: { children: ReactNode }) {
  return <main className="shell py-10 md:py-16">{children}</main>;
}

// The class of the „Към …“ link at the top of a moderator page (back to the hub or the
// list): a quiet text link, 48 px high.
export const BACK_LINK =
  "mb-6 inline-flex min-h-12 items-center gap-2 font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline";
