// The list of published education cards on /kak-raboti (W3-05): one big card per
// scam script with its type, title, the start of "how it starts" and an arrow to the
// whole card. The „Роднина в беда“ card comes first (order.ts, D34).
// Look (Ореол v3): a bento grid of large glass cards (education.css .edu-bento). The
// cards are not identical rows: the first and the fourth are wide, the others narrow,
// and each type has its own soft halo light (data-type). The title link covers the
// whole card (a stretched ::after), so the card is one big target.
//
// No "use client" and no server code: used by the real page (rendered on the server)
// and by the browser-test preview /dev/kak-raboti (rendered in the browser).

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Notice } from "@/components/ui/Notice";
import { EmptyState } from "@/components/ui/States";
import { bg } from "@/i18n/bg";
import type { PublicScriptDto } from "@/schemas/scripts";
import { fakeRelativeFirst } from "./order";

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
    <ul className="edu-bento">
      {fakeRelativeFirst(scripts).map((script) => (
        <li key={script.slug} className="edu-tile" data-type={script.scriptType}>
          <div className="edu-tile-light" aria-hidden="true" />
          <Badge className="edu-tile-badge">{bg.scripts.typeNames[script.scriptType]}</Badge>
          <Link href={hrefFor(script.slug)} className="edu-tile-link">
            <span className="sr-only">{bg.education.readCard}: </span>
            <span className="edu-tile-title">{script.titleBg}</span>
          </Link>
          <p className="edu-tile-text">{script.howItStartsBg}</p>
          <span className="edu-tile-arrow" aria-hidden="true">
            <ArrowUpRight className="size-6" />
          </span>
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
      <Notice status="danger" role="alert" className="max-w-[60ch]">
        <p>{bg.education.loadError}</p>
      </Notice>
      <section aria-labelledby="edu-rules-title" className="edu-rules surface-raised">
        <h2 id="edu-rules-title" className="edu-section-title">
          {bg.education.rulesTitle}
        </h2>
        <ul className="edu-rules-list">
          {bg.home.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
