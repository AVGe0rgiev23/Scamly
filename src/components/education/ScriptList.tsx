// The list of published education cards on /kak-raboti (W3-05): one tile per scam
// script with its name, title, how it starts and a link to the whole card.
//
// No "use client" and no server code: used by the real page (rendered on the server)
// and by the browser-test preview /dev/kak-raboti (rendered in the browser).

import Link from "next/link";
import { bg } from "@/i18n/bg";
import type { PublicScriptDto } from "@/schemas/scripts";

type ScriptListProps = {
  scripts: PublicScriptDto[];
  // The address of one card. The real page uses /kak-raboti/<slug>; the preview its own.
  hrefFor: (slug: string) => string;
};

export function ScriptList({ scripts, hrefFor }: ScriptListProps) {
  if (scripts.length === 0) {
    return <p className="edu-message">{bg.education.empty}</p>;
  }
  return (
    <ul className="edu-list">
      {scripts.map((script) => (
        <li key={script.slug} className="card edu-tile">
          <p className="edu-type">{bg.scripts.typeNames[script.scriptType]}</p>
          <h3>{script.titleBg}</h3>
          <p>{script.howItStartsBg}</p>
          <Link href={hrefFor(script.slug)} className="button button-primary">
            {bg.education.readCard}
            <span className="sr-only">: {script.titleBg}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Shown instead of the list when the cards can't be loaded: the error and the three
// rules from the home page, so the page still helps during a call.
export function ScriptsUnavailable() {
  return (
    <div className="edu-unavailable">
      <p role="alert" className="edu-message">
        {bg.education.loadError}
      </p>
      <section className="card home-rules" aria-labelledby="edu-rules-title">
        <h2 id="edu-rules-title">{bg.education.rulesTitle}</h2>
        <ul>
          {bg.home.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
