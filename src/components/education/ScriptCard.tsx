// One education card („Как работи измамата“, W3-05): how the call starts, what the
// scammers say and what to do. Written for older readers: body text at text-xl, three
// separated sections, quotes with a rule at the left, numbered steps in mono. It also
// prints well (buttons hidden, a short note with the app name only on paper).
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

type ScriptCardProps = {
  script: PublicScriptDto;
  listHref?: string; // „Всички схеми“; the preview passes its own list page
};

const SECTION = "border-t border-line py-8 md:grid md:grid-cols-12 md:gap-x-6 md:py-10";
const SECTION_TITLE = "text-h3 md:col-span-4";
const SECTION_BODY = "mt-4 max-w-[60ch] text-xl md:col-span-8 md:mt-0";

export function ScriptCard({ script, listHref = ROUTES.education }: ScriptCardProps) {
  return (
    <article aria-labelledby="edu-card-title">
      <header className="mb-10 max-w-[60ch] md:mb-14">
        <Badge>{bg.scripts.typeNames[script.scriptType]}</Badge>
        <h1 id="edu-card-title" className="mt-4 text-h1">
          {script.titleBg}
        </h1>
      </header>

      <section className={SECTION} aria-labelledby="edu-starts">
        <h2 id="edu-starts" className={SECTION_TITLE}>
          {bg.education.howItStarts}
        </h2>
        <p className={SECTION_BODY}>{script.howItStartsBg}</p>
      </section>

      <section className={SECTION} aria-labelledby="edu-say">
        <h2 id="edu-say" className={SECTION_TITLE}>
          {bg.education.whatTheySay}
        </h2>
        <ul className={`${SECTION_BODY} flex flex-col gap-4`}>
          {splitPhrases(script.whatTheySayBg).map((phrase) => (
            <li key={phrase} className="border-l-2 border-line-strong pl-5">
              {phrase}
            </li>
          ))}
        </ul>
      </section>

      <section className={SECTION} aria-labelledby="edu-todo">
        <h2 id="edu-todo" className={SECTION_TITLE}>
          {bg.education.whatToDo}
        </h2>
        {/* An ordered list: the steps in the order to follow them. The mono numbers
            are a CSS counter (::before), so they are not part of the step's text. */}
        <ol className={`${SECTION_BODY} flex flex-col gap-5 [counter-reset:step]`}>
          {splitSentences(script.whatToDoBg).map((step) => (
            <li
              key={step}
              className="grid grid-cols-[2.5rem_1fr] items-baseline gap-3 [counter-increment:step] before:tabular before:font-mono before:text-lg before:text-accent before:content-[counter(step,decimal-leading-zero)]"
            >
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="hidden border-t border-line pt-4 text-base print:block">
        {bg.education.printNote}
      </p>

      <div className="no-print flex flex-wrap gap-3 border-t border-line pt-8 print:hidden">
        <PrintButton />
        <ButtonLink href={listHref} variant="ghost" size="lg">
          <ArrowLeft className="size-5" aria-hidden="true" />
          {bg.education.backToList}
        </ButtonLink>
      </div>
    </article>
  );
}
