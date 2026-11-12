// Shows a verdict of the engine: red = signs of a scam, amber = suspicious,
// green = no typical signs. It does not score calls itself.
//
// The level is never shown by colour alone: there is always an icon, the headline in
// words and the signal line (jagged for red, calm for green). The headline and the
// advice always come from bg.verdict, so green can only ever show the D9 wording
// (never "safe"), whatever a server or a bug might send.

import type { Ref } from "react";
import { bg } from "@/i18n/bg";
import { STATUS_SOLID, STATUS_TINT, StatusIcon, type Status } from "./Badge";
import { cn } from "./cn";
import { SignalLine, signalForLevel } from "./SignalLine";

export type VerdictLevel = "red" | "yellow" | "green";

// Which status colours belong to which level of the engine.
export const LEVEL_STATUS: Record<VerdictLevel, Status> = {
  red: "danger",
  yellow: "caution",
  green: "safe",
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
  const title = (
    <>
      <StatusIcon status={status} className={big ? "mt-[0.08em] size-[0.9em]" : "mt-[0.12em]"} />
      <span>{text.title}</span>
    </>
  );
  return (
    <div
      className={cn("overflow-hidden rounded-lg border", STATUS_TINT[status], className)}
      data-level={level}
    >
      {/* The headline band: the one solid block of status colour on the screen. */}
      <div className={cn("border-b px-5 pt-5 pb-4 md:px-6", STATUS_SOLID[status])}>
        {big ? (
          <h1 ref={headingRef} tabIndex={-1} className="flex items-start gap-3 text-h1">
            {title}
          </h1>
        ) : (
          <h3 ref={headingRef} className="flex items-start gap-2.5 text-h3">
            {title}
          </h3>
        )}
        {lead === undefined ? null : (
          <p className={cn("mt-2 font-display font-bold", big ? "text-h2" : "text-xl")}>{lead}</p>
        )}
      </div>
      <SignalLine state={signalForLevel(level)} className="h-8 px-0" />
      <div className={cn("px-5 pb-5 text-fg md:px-6", big ? "text-xl" : "text-base")}>
        <p>{text.description}</p>
        {reasons.length === 0 ? null : (
          <>
            {reasonsTitle === undefined ? null : (
              <p className="mt-4 text-sm font-semibold text-fg-muted">{reasonsTitle}</p>
            )}
            <ul className="verdict-reasons mt-2 flex flex-col gap-1.5">
              {reasons.map((reason) => (
                <li key={reason} className="border-l-2 border-current pl-3">
                  {reason}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
