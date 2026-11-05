// Displays a verdict using words and symbols as well as colour; does not score calls.
// The headline and advice always come from bg.verdict, so green can only ever show
// the D9 wording (never "safe"), whatever a server or a bug might send.
import type { Ref } from "react";
import { bg } from "@/i18n/bg";
import { Card } from "./Card";

// The symbol shown before the verdict's words (shared with VerdictBadge).
export const VERDICT_SYMBOLS = { red: "!", yellow: "!", green: "✓" } as const;

type VerdictProps = {
  level: "red" | "yellow" | "green";
  // 1 on a page where the verdict is the main heading (the call-check result).
  headingLevel?: 1 | 3;
  // Lets a page move the focus to the headline (React 19: `ref` objects are props).
  headingRef?: Ref<HTMLHeadingElement>;
  // An extra short, big line under the headline, e.g. „Затворете телефона.“
  lead?: string;
  // Up to a few "why" lines in plain words, with a small title above them.
  reasons?: string[];
  reasonsTitle?: string;
};

export function Verdict({
  level,
  headingLevel = 3,
  headingRef,
  lead,
  reasons = [],
  reasonsTitle,
}: VerdictProps) {
  const text = bg.verdict[level];
  const symbol = VERDICT_SYMBOLS[level];
  const title = (
    <>
      <span aria-hidden="true">{symbol} </span>
      {text.title}
    </>
  );
  return (
    <Card className={`verdict verdict-${level}`}>
      {headingLevel === 1 ? (
        <h1 className="verdict-title" ref={headingRef} tabIndex={-1}>
          {title}
        </h1>
      ) : (
        <h3 ref={headingRef}>{title}</h3>
      )}
      {lead === undefined ? null : <p className="verdict-lead">{lead}</p>}
      <p>{text.description}</p>
      {reasons.length === 0 ? null : (
        <>
          {reasonsTitle === undefined ? null : <p className="verdict-why">{reasonsTitle}</p>}
          <ul className="verdict-reasons">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
