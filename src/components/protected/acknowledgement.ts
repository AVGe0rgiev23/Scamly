// The big message on the phone after a family member pressed „Обаждам ѝ се сега“:
// „Иван ще ви се обади веднага.“ Pure function, unit-tested in acknowledgement.test.ts.

import { fill } from "@/components/family/format";
import { bg } from "@/i18n/bg";
import type { AcknowledgementDto } from "@/schemas/checks";

// null = nobody has answered yet (show nothing).
export function familyMessage(acknowledgement: AcknowledgementDto | null): string | null {
  if (acknowledgement === null) {
    return null;
  }
  if (acknowledgement.displayName === null) {
    return bg.checks.acknowledgedBySomeone; // the name is no longer known
  }
  return fill(bg.checks.acknowledgedBy, { name: acknowledgement.displayName });
}
