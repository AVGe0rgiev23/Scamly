// Shows a verdict of the engine: red = signs of a scam, amber = suspicious,
// green = no typical signs. It does not score calls itself.
//
// The level is never shown by colour alone: there is always an icon, the headline in
// words and the reasons. The headline and the advice always come from bg.verdict, so
// green can only ever show the D9 wording (never "safe"), whatever a server or a bug
// might send.
//
// Look: a deep panel of the verdict's colour with its light rising from the top
// edge (a soft blurred glow), the icon on a solid disc, and the card settling into
// place when it appears (globals.css .verdict-reveal: 600–900 ms; a plain 150 ms
// fade with reduced motion).

import type { Ref } from "react";
import { bg } from "@/i18n/bg";
import { StatusIcon, type Status } from "./Badge";
import { cn } from "./cn";

export type VerdictLevel = "red" | "yellow" | "green";

// Which status colours belong to which level of the engine.
export const LEVEL_STATUS: Record<VerdictLevel, Status> = {
  red: "danger",
  yellow: "caution",
  green: "safe",
};

// Class names per level, written out in full so Tailwind can find them.
const PANEL: Record<VerdictLevel, string> = {
  red: "border-danger-line bg-danger-bg",
  yellow: "border-caution-line bg-caution-bg",
  green: "border-safe-line bg-safe-bg",
};
const GLOW: Record<VerdictLevel, string> = {
  red: "bg-danger-solid",
  yellow: "bg-caution-solid",
  green: "bg-safe-solid",
};
const DISC: Record<VerdictLevel, string> = {
  red: "bg-danger-solid text-danger-on",
  yellow: "bg-caution-solid text-caution-on",
  green: "bg-safe-solid text-safe-on",
};
const TITLE: Record<VerdictLevel, string> = {
  red: "text-danger-fg",
  yellow: "text-caution-fg",
  green: "text-safe-fg",
};
const DOT: Record<VerdictLevel, string> = {
  red: "bg-danger-solid",
  yellow: "bg-caution-solid",
  green: "bg-safe-solid",
};

type VerdictProps = {
  level: VerdictLevel;
  // 1 on a page where the verdict is the main heading (the call-check result).
  headingLevel?: 1 | 3;
  // Lets a page move the focus to the headline (React 19: `ref` objects are props).
  headingRef?: Ref<HTMLHeadingElement>;
  // An extra short, big line under the headline, e.g. „Затворете телефона.“
  lead?: string;
  // Up to a few "why" lines in plain words, with a small title above them.
  reasons?: string[];
  reasonsTitle?: string;
  className?: string;
};

export function Verdict({
  level,
  headingLevel = 3,
  headingRef,
  lead,
  reasons = [],
  reasonsTitle,
  className,
}: VerdictProps) {
  const text = bg.verdict[level];
  const status = LEVEL_STATUS[level];
  const big = headingLevel === 1;
  const icon = (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full shadow-highlight",
        DISC[level],
        big ? "size-14 md:size-16 [&>svg]:size-8" : "size-10 [&>svg]:size-5",
      )}
    >
      <StatusIcon status={status} />
    </span>
  );
  return (
    <div
      className={cn(
        "verdict-reveal relative isolate overflow-hidden rounded-xl border shadow-raised",
        PANEL[level],
        className,
      )}
      data-level={level}
    >
      {/* The verdict's own light, rising from the top edge. Decoration only. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -top-32 left-1/2 -z-10 h-56 w-[80%] -translate-x-1/2 rounded-full opacity-35 blur-3xl",
          GLOW[level],
        )}
      />
      <div className={cn("px-6 pt-6 md:px-8", big ? "md:pt-10" : "")}>
        {big ? (
          <h1
            ref={headingRef}
            tabIndex={-1}
            className={cn(
              "flex flex-col items-start gap-5 text-h1 sm:flex-row sm:items-center",
              TITLE[level],
            )}
          >
            {icon}
            <span>{text.title}</span>
          </h1>
        ) : (
          <h3 ref={headingRef} className={cn("flex items-center gap-3 text-h3", TITLE[level])}>
            {icon}
            <span>{text.title}</span>
          </h3>
        )}
        {lead === undefined ? null : (
          <p className={cn("mt-4 font-display font-semibold text-fg", big ? "text-h2" : "text-xl")}>
            {lead}
          </p>
        )}
      </div>
      <div className={cn("px-6 pt-4 pb-6 text-fg md:px-8", big ? "text-xl md:pb-10" : "text-base")}>
        <p>{text.description}</p>
        {reasons.length === 0 ? null : (
          <>
            {reasonsTitle === undefined ? null : (
              <p className="mt-6 text-sm font-semibold text-fg">{reasonsTitle}</p>
            )}
            <ul className="verdict-reasons mt-3 flex flex-col gap-2.5">
              {reasons.map((reason) => (
                <li key={reason} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={cn("mt-[0.6em] size-2 shrink-0 rounded-full", DOT[level])}
                  />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
