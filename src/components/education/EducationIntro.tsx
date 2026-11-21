// The frame and the page head of /kak-raboti („Как работи измамата“, W3-05). Shared by
// the real pages and the browser-test previews /dev/kak-raboti, so both look the same.
// Look (Ореол v3): EducationFrame is the <main> column with a soft aurora behind the
// top of the page; EducationIntro is the editorial head: an eyebrow with a halo dot,
// the title with its last word in the halo, a large lead, the intro in muted text and
// the printable fridge card as a secondary pill with a printer icon.
// Server Components; education.css is imported here (the top of every education page).

import { Printer } from "lucide-react";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import "./education.css";

export function EducationFrame({ children }: { children: ReactNode }) {
  return (
    <main className="edu shell py-10 md:py-16">
      <div className="edu-aurora" aria-hidden="true" />
      {children}
    </main>
  );
}

// "Как работи измамата" → "Как работи " + "измамата" (the last word gets the halo).
function splitLastWord(text: string): [string, string] {
  const space = text.lastIndexOf(" ");
  return space === -1 ? ["", text] : [text.slice(0, space + 1), text.slice(space + 1)];
}

export function EducationIntro() {
  const [start, last] = splitLastWord(bg.education.title);
  return (
    <header className="edu-head">
      <p className="eyebrow edu-eyebrow">{bg.education.eyebrow}</p>
      <h1 className="text-h1 text-balance">
        {start}
        <span className="halo-word">{last}</span>
      </h1>
      <p className="mt-6 max-w-[40ch] font-display text-2xl">{bg.education.lead}</p>
      <p className="mt-4 max-w-[60ch] text-lg text-fg-muted">{bg.education.intro}</p>
      <p className="mt-8 print:hidden">
        <ButtonLink href={ROUTES.fridgeCard} variant="secondary" size="lg">
          <Printer className="size-5" aria-hidden="true" />
          {bg.fridgeCard.link}
        </ButtonLink>
      </p>
    </header>
  );
}
