// A small verdict label for lists (e.g. the family's check history): the same
// colours and symbols as <Verdict />, plus a short word, so the level is never
// shown by colour alone. `null` = the check was started but not answered yet.
import { bg } from "@/i18n/bg";
import { VERDICT_SYMBOLS } from "./Verdict";

export function VerdictBadge({ level }: { level: "red" | "yellow" | "green" | null }) {
  if (level === null) {
    return (
      <span className="verdict-badge verdict-pending">
        <span aria-hidden="true">…</span>
        {bg.verdictBadge.pending}
      </span>
    );
  }
  return (
    <span className={`verdict-badge verdict verdict-${level}`}>
      <span aria-hidden="true">{VERDICT_SYMBOLS[level]}</span>
      {bg.verdictBadge[level]}
    </span>
  );
}
