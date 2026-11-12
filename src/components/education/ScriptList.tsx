// The list of published education cards on /kak-raboti (W3-05): one big link row per
// scam script with its type, title, how it starts and an arrow to the whole card.
// Rows are separated by hairlines (an editorial list, not a grid of boxes).
//
// No "use client" and no server code: used by the real page (rendered on the server)
// and by the browser-test preview /dev/kak-raboti (rendered in the browser).

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { bg } from "@/i18n/bg";
import type { PublicScriptDto } from "@/schemas/scripts";

type ScriptListProps = {
  scripts: PublicScriptDto[];
  // The address of one card. The real page uses /kak-raboti/<slug>; the preview its own.
  hrefFor: (slug: string) => string;
};

export function ScriptList({ scripts, hrefFor }: ScriptListProps) {
  if (scripts.length === 0) {
    return <EmptyState text={bg.education.empty} />;
  }
  return (
    <ul className="border-t border-line">
      {scripts.map((script) => (
        <li key={script.slug} className="border-b border-line py-8 md:py-10">
          <Badge>{bg.scripts.typeNames[script.scriptType]}</Badge>
          <Link
            href={hrefFor(script.slug)}
            className="group mt-3 flex min-h-12 items-start justify-between gap-6 text-fg no-underline hover:text-accent"
          >
            <span className="sr-only">{bg.education.readCard}: </span>
            <span className="font-display text-h2 font-bold tracking-[-0.02em] text-balance">
              {script.titleBg}
            </span>
            <ArrowRight className="mt-[0.3em] size-7 shrink-0 md:size-9" aria-hidden="true" />
          </Link>
          <p className="mt-3 max-w-[60ch] text-lg text-fg-muted">{script.howItStartsBg}</p>
        </li>
      ))}
    </ul>
  );
}

// Shown instead of the list when the cards can't be loaded: the error and the three
// rules from the home page, so the page still helps during a call.
export function ScriptsUnavailable() {
  return (
    <div className="flex flex-col gap-8">
      <div role="alert" className="rounded-lg border border-danger-line bg-danger-bg px-5 py-4">
        <p className="text-fg">{bg.education.loadError}</p>
      </div>
      <section aria-labelledby="edu-rules-title" className="max-w-[60ch]">
        <h2 id="edu-rules-title" className="text-h3">
          {bg.education.rulesTitle}
        </h2>
        <ul className="mt-4 border-t border-line">
          {bg.home.rules.map((rule) => (
            <li key={rule} className="border-b border-line py-4 text-xl">
              {rule}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
