// The „Провери истинския“ part of /family/alerts (P-06), at the top of the page:
//   - my open questions („Някой се представя за теб пред Мария.“ + „Отговорете сега“,
//     a link to the answer screen /family/proveri?id=…);
//   - the family's warnings of the last 24 hours („Някой се представя за Иван. Ако ви
//     звънне, затворете.“, #38).
// Live with watchMyIdentityChecks (Realtime + polling, src/lib/realtime.ts). Shows
// nothing when there is nothing to show, or when the list can't be loaded (the
// alerts below have their own error message).
"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { watchMyIdentityChecks } from "@/lib/realtime";
import type { MyIdentityChecksDto } from "@/schemas/identityChecks";
import { fill, formatDateTime } from "./format";

export function IdentityRequests({ personIds }: { personIds: string[] }) {
  const [data, setData] = useState<MyIdentityChecksDto | null>(null);
  // One string as the effect's key, so a new array with the same ids does not restart it.
  const key = personIds.join(",");

  useEffect(() => {
    const ids = key === "" ? [] : key.split(",");
    return watchMyIdentityChecks(ids, setData);
  }, [key]);

  if (data === null || (data.pending.length === 0 && data.warnings.length === 0)) {
    return null;
  }
  return (
    <div className="flex flex-col gap-4">
      {data.pending.length > 0 ? (
        <ul className="family-identity-list" aria-label={bg.identityAnswer.listLabel}>
          {data.pending.map((check) => (
            <li key={check.id} className="family-identity-item">
              <p className="family-identity-item-text">
                {fill(bg.identityAnswer.pendingLine, {
                  person: check.personName ?? bg.identityChecks.someone,
                })}
              </p>
              <ButtonLink
                href={`${ROUTES.familyIdentity}?id=${encodeURIComponent(check.id)}`}
                variant="danger"
                size="lg"
              >
                <ShieldAlert className="size-5 shrink-0" aria-hidden="true" />
                {bg.identityAnswer.open}
              </ButtonLink>
            </li>
          ))}
        </ul>
      ) : null}
      {data.warnings.length > 0 ? (
        <ul className="family-identity-list" aria-label={bg.identityAnswer.warningsLabel}>
          {data.warnings.map((check) => (
            <li key={check.id}>
              <Notice
                status="danger"
                className="text-lg"
                title={fill(bg.identityChecks.warnTitle, {
                  name: check.claimedName ?? bg.identityChecks.someone,
                })}
              >
                <p>
                  {fill(bg.identityChecks.warnBody, {
                    name: check.claimedName ?? bg.identityChecks.someone,
                  })}
                </p>
                <p className="mt-1 text-base text-fg-muted">
                  {formatDateTime(check.answeredAt ?? check.createdAt)}
                </p>
              </Notice>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
