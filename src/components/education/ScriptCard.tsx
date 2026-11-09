// One education card („Как работи измамата“, W3-05): how the call starts, what the
// scammers say and what to do. Big, readable text, also good on paper.
//
// No "use client" and no server code: the real page /kak-raboti/[slug] renders it on
// the server, and the browser-test preview /dev/kak-raboti/karta renders it in the
// browser with the same markup.

import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import type { PublicScriptDto } from "@/schemas/scripts";
import { PrintButton } from "./PrintButton";
import { splitPhrases, splitSentences } from "./text";

type ScriptCardProps = {
  script: PublicScriptDto;
  listHref?: string; // „Всички схеми“; the preview passes its own list page
};

export function ScriptCard({ script, listHref = ROUTES.education }: ScriptCardProps) {
  return (
    <article className="edu-card" aria-labelledby="edu-card-title">
      <p className="edu-type">{bg.scripts.typeNames[script.scriptType]}</p>
      <h1 id="edu-card-title">{script.titleBg}</h1>

      <section className="card edu-section" aria-labelledby="edu-starts">
        <h2 id="edu-starts">{bg.education.howItStarts}</h2>
        <p>{script.howItStartsBg}</p>
      </section>

      <section className="card edu-section" aria-labelledby="edu-say">
        <h2 id="edu-say">{bg.education.whatTheySay}</h2>
        <ul className="edu-phrases">
          {splitPhrases(script.whatTheySayBg).map((phrase) => (
            <li key={phrase}>{phrase}</li>
          ))}
        </ul>
      </section>

      <section className="card edu-section edu-todo" aria-labelledby="edu-todo">
        <h2 id="edu-todo">{bg.education.whatToDo}</h2>
        {/* An ordered list: the steps in the order to follow them. */}
        <ol className="edu-steps">
          {splitSentences(script.whatToDoBg).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <p className="edu-print-only">{bg.education.printNote}</p>

      <div className="edu-actions edu-no-print">
        <PrintButton />
        <Link href={listHref} className="button button-secondary">
          {bg.education.backToList}
        </Link>
      </div>
    </article>
  );
}
