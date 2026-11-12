// The start page of the moderator area (/moderator, W3-05): two panels of different
// width in a 12-column grid, one per job. „Схеми на измамите“ (narrow) opens the script
// editor; „Сигнали за проверка“ (wide) opens the report queue (W3-04) and shows how many
// reports wait as a big number (<PendingReportsCard />, which loads it in the browser).
// The rest is a Server Component (plain HTML).

import { ArrowRight, BookOpen } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { PendingReportsCard } from "./PendingReportsCard";

export function ModeratorHub() {
  return (
    <>
      <header className="mb-10 max-w-[60ch]">
        <h1 className="text-h1">{bg.moderator.hubTitle}</h1>
        <p className="mt-4 text-lg text-fg-muted">{bg.moderator.hubIntro}</p>
      </header>
      <ul className="grid gap-6 md:grid-cols-12">
        <li className="flex flex-col rounded-lg border border-line p-6 md:col-span-5 md:p-8">
          <BookOpen className="size-6 text-fg-subtle" aria-hidden="true" />
          <h2 className="mt-4 text-h3">{bg.moderator.scriptsCardTitle}</h2>
          <p className="mt-2 mb-6 text-fg-muted">{bg.moderator.scriptsCardText}</p>
          <ButtonLink
            href={ROUTES.moderatorScripts}
            variant="secondary"
            className="mt-auto self-start"
          >
            {bg.moderator.scriptsCardLink}
            <ArrowRight className="size-5" aria-hidden="true" />
          </ButtonLink>
        </li>
        <PendingReportsCard href={ROUTES.moderatorReports} />
      </ul>
    </>
  );
}
