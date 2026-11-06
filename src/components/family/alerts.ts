// Small pure helpers of the family's alert page /family/alerts (W2-03) and its
// „Обаждам ѝ се сега“ button (W2-04). No React, no browser, so they are unit-tested
// in alerts.test.ts.

import { bg } from "@/i18n/bg";
import type { AcknowledgeResultDto, CheckDto } from "@/schemas/checks";
import { fill } from "./format";

// A check id in the address (/family/alerts?check=<id>, the link in a push
// notification or an e-mail). Only a well-formed UUID counts; anything else is ignored.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function focusCheckId(search: string): string | null {
  const id = new URLSearchParams(search).get("check");
  return id !== null && UUID.test(id) ? id.toLowerCase() : null;
}

// The ids in `checks` that were not in `known` (the checks shown before). On the first
// load (`known` is null) nothing counts as new: those alerts are not news.
export function findNewCheckIds(known: Set<string> | null, checks: CheckDto[]): string[] {
  if (known === null) {
    return [];
  }
  return checks.filter((check) => !known.has(check.id)).map((check) => check.id);
}

// The name of the person a check belongs to, from the family member's list of people.
export function personNameOf(names: Map<string, string>, check: CheckDto): string {
  return names.get(check.protectedPersonId) ?? bg.alerts.someone;
}

// „Проверката още тече.“ / „Проверката е завършена.“
export function statusText(check: CheckDto): string {
  return check.status === "answered" ? bg.alerts.statusAnswered : bg.alerts.statusStarted;
}

// What the family member sees after pressing „Обаждам ѝ се сега“ (W2-04): the first
// one to press "takes the call"; anyone later learns who is already calling.
export function responderMessage(result: AcknowledgeResultDto): string {
  if (result.first) {
    return bg.alerts.youResponded;
  }
  const name = result.acknowledgement.displayName;
  return name === null ? bg.alerts.someoneResponding : fill(bg.alerts.otherResponding, { name });
}

// The screen-reader announcement for new alerts, e.g.
// „Нов сигнал: Баба Елена проверява съмнително обаждане.“ (one sentence per alert).
export function announcementFor(newChecks: CheckDto[], names: Map<string, string>): string {
  return newChecks
    .map((check) => fill(bg.alerts.announceNew, { name: personNameOf(names, check) }))
    .join(" ");
}
