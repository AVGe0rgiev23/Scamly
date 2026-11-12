// A small verdict label for lists (e.g. the family's check history): the same
// colours as <Verdict />, with an icon and a short word, so the level is never shown
// by colour alone. `null` = the check was started but not answered yet.

import { Clock } from "lucide-react";
import { bg } from "@/i18n/bg";
import { StatusPill } from "./Badge";
import { LEVEL_STATUS, type VerdictLevel } from "./Verdict";

export function VerdictBadge({ level }: { level: VerdictLevel | null }) {
  if (level === null) {
    return (
      <StatusPill
        status="neutral"
        className="verdict-badge"
        icon={<Clock className="size-[1.15em] shrink-0" aria-hidden="true" />}
      >
        {bg.verdictBadge.pending}
      </StatusPill>
    );
  }
  return (
    <StatusPill status={LEVEL_STATUS[level]} className="verdict-badge" data-level={level}>
      {bg.verdictBadge[level]}
    </StatusPill>
  );
}
