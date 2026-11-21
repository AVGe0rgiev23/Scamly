// One education card („Как работи измамата“, W3-05): how the call starts, what the
// scammers say and what to do. Written for older readers: body text at text-xl and
// three clearly separated parts.
// Look (Ореол v3, education.css): "how it starts" on a raised panel; "what they say"
// as quotes in glass speech bubbles with a halo hairline at the left; "what to do" as
// a sequence of steps with numbered halo nodes on a rail (the numbers are a CSS
// counter, so they are not part of the step's text). It also prints well: black on
// white, no glass or aurora, buttons hidden, a short note with the app name only on
// paper (education.css @media print).
//
// No "use client" and no server code: the real page /kak-raboti/[slug] renders it on
// the server, and the browser-test preview /dev/kak-raboti/karta renders it in the
// browser with the same markup.

import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import type { PublicScriptDto } from "@/schemas/scripts";
import { PrintButton } from "./PrintButton";
import { splitPhrases, splitSentences } from "./text";
import "./education.css";

type ScriptCardProps = {
  script: PublicScriptDto;
  listHref?: string; // „Всички схеми“; the preview passes its own list page
};

export function ScriptCard({ script, listHref = ROUTES.education }: ScriptCardProps) {
  return (
    <article aria-labelledby="edu-card-title" className="edu-card">
      <header className="edu-card-head">
        <Badge className="edu-card-badge">{bg.scripts.typeNames[script.scriptType]}</Badge>
        <h1 id="edu-card-title" className="mt-5 text-h1 text-balance">
          {script.titleBg}
        </h1>
        <div className="halo-line edu-card-line" aria-hidden="true" />
      </header>

      <section className="edu-part edu-start" aria-labelledby="edu-starts">
        <h2 id="edu-starts" className="edu-section-title">
          {bg.education.howItStarts}
        </h2>
        <p className="text-xl">{script.howItStartsBg}</p>
      </section>

      <section className="edu-part" aria-labelledby="edu-say">
        <h2 id="edu-say" className="edu-section-title">
          {bg.education.whatTheySay}
        </h2>
        <ul className="edu-quotes">
          {splitPhrases(script.whatTheySayBg).map((phrase) => (
            <li key={phrase} className="edu-quote text-xl">
              {phrase}
            </li>
          ))}
        </ul>
      </section>

      <section className="edu-part" aria-labelledby="edu-todo">
        <h2 id="edu-todo" className="edu-section-title">
          {bg.education.whatToDo}
        </h2>
        {/* An ordered list: the steps in the order to follow them. The numbers in the
            halo nodes are a CSS counter (::before), so they are not part of the text. */}
        <ol className="edu-steps">
          {splitSentences(script.whatToDoBg).map((step) => (
            <li key={step} className="edu-step text-xl">
              {step}
            </li>
          ))}
        </ol>
      </section>

      <p className="edu-print-note hidden print:block">{bg.education.printNote}</p>

      <div className="no-print edu-card-actions print:hidden">
        <PrintButton />
        <ButtonLink href={listHref} variant="ghost" size="lg">
          <ArrowLeft className="size-5" aria-hidden="true" />
          {bg.education.backToList}
        </ButtonLink>
      </div>
    </article>
  );
}
