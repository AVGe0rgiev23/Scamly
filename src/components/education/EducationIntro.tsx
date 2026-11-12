// The heading and intro of /kak-raboti („Как работи измамата“, W3-05). Shared by the
// real page and the browser-test preview /dev/kak-raboti, so both look the same.
// Look: editorial, a large lead, the intro in muted text and a quiet link to the
// printable fridge card.

import Link from "next/link";
import { Printer } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

export function EducationIntro() {
  return (
    <header className="mb-12 max-w-[60ch] md:mb-16">
      <h1 className="text-h1">{bg.education.title}</h1>
      <p className="mt-6 text-xl">{bg.education.lead}</p>
      <p className="mt-4 text-lg text-fg-muted">{bg.education.intro}</p>
      <p className="mt-6 print:hidden">
        <Link
          href={ROUTES.fridgeCard}
          className="inline-flex min-h-12 items-center gap-2 font-semibold text-accent underline underline-offset-4 hover:text-accent-hover"
        >
          <Printer className="size-5" aria-hidden="true" />
          {bg.fridgeCard.link}
        </Link>
      </p>
    </header>
  );
}
