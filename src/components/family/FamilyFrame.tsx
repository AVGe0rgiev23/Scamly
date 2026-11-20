// The frame of every family page: one <main> with the page column of the design
// system (`shell`: 1240 px at most, 16 / 32 px gutter), a soft aurora glow behind
// the top of the page (family.css .family-aurora, decoration only) and the same
// spacing. FamilyHeader is the shared page head: a small eyebrow, the title, one
// intro sentence and an optional row of actions.
// Who is logged in and „Изход“ are in the site header (SiteHeader), not here.
// Used by FamilyGate (the real /family pages) and by the test previews (/dev/family).
// Server Components (plain HTML); the CSS is imported by the two family layouts.

import type { ReactNode } from "react";

export function FamilyFrame({ children }: { children: ReactNode }) {
  return (
    <main className="family shell py-10 md:py-16">
      <div className="family-aurora" aria-hidden="true" />
      {children}
    </main>
  );
}

export function FamilyHeader({
  eyebrow,
  title,
  intro,
  actions,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="family-head">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow family-eyebrow">{eyebrow}</p> : null}
        <h1 className="text-h1">{title}</h1>
        {intro ? <p className="mt-4 max-w-[60ch] text-lg text-fg-muted">{intro}</p> : null}
      </div>
      {actions ? <div className="family-head-actions">{actions}</div> : null}
    </header>
  );
}
