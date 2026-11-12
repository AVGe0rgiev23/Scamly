// The result screen of the call check: the verdict in big plain words (Roberta's
// Verdict: headline, advice and up to 4 reasons), the big „Обади се на Иван“ button
// and „Нова проверка“.
//
// When a family member presses „Обаждам ѝ се сега“, a big message appears:
// „Иван ще ви се обади веднага.“ (CallCheck watches the check live).
//
// Red leads with the risk and the instruction „Затворете телефона.“ The call
// action comes before the explanation and reassurance. Green shows exactly the D9 wording and never says "safe".

import { MessageCircle, PhoneCall } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Verdict } from "@/components/ui/Verdict";
import type { RiskLevel } from "@/engine";
import { bg } from "@/i18n/bg";
import type { CallContactDto } from "@/schemas/checks";
import { CallContactButton } from "./CallContactButton";

// How many "why" lines we show: more would be too much to read in a hurry.
export const MAX_REASONS = 4;

type CheckResultProps = {
  level: RiskLevel;
  reasons: string[]; // Bulgarian "why" lines from the engine
  callContact: CallContactDto | null;
  afterCall: boolean; // the call has already ended: no „Затворете телефона.“
  local: boolean; // computed on the phone (offline fallback): show the small note
  familyMessage: string | null; // „Иван ще ви се обади веднага.“, null until then
  suggestEmergencyCall: boolean;
  onNewCheck: () => void;
};

export function CheckResult({
  level,
  reasons,
  callContact,
  afterCall,
  local,
  familyMessage,
  suggestEmergencyCall,
  onNewCheck,
}: CheckResultProps) {
  const heading = useRef<HTMLHeadingElement>(null);

  // The result replaces the question screen: move the focus to the headline, so a
  // screen reader reads it at once and the page starts at the top.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section className="appear flex flex-col gap-5" data-level={level}>
      <Verdict
        level={level}
        headingLevel={1}
        headingRef={heading}
        lead={level === "red" && !afterCall ? bg.protectedCheck.hangUp : undefined}
      />
      {callContact === null ? null : <CallContactButton contact={callContact} />}
      {local ? (
        <Notice status="caution" className="text-base">
          {bg.protectedCheck.localNote}
        </Notice>
      ) : null}
      {/* role="status": a live region, there from the start, so a screen reader reads
          the family message aloud the moment it appears. */}
      <div role="status">
        {familyMessage === null ? null : (
          <p className="appear flex items-start gap-3 rounded-lg border border-info-line bg-info-bg p-5 font-display text-h3 font-bold text-fg">
            <MessageCircle className="mt-[0.1em] size-7 shrink-0 text-info-fg" aria-hidden="true" />
            {familyMessage}
          </p>
        )}
      </div>
      <div role="status">
        {suggestEmergencyCall ? (
          <p className="appear flex items-start gap-3 rounded-lg border border-caution-line bg-caution-bg p-5 font-display text-h3 font-bold text-fg">
            <PhoneCall className="mt-[0.1em] size-7 shrink-0 text-caution-fg" aria-hidden="true" />
            {bg.protectedCheck.emergencyCallAdvice}
          </p>
        ) : null}
      </div>
      {reasons.length ? (
        <div className="border-t border-line pt-5">
          <h2 className="font-sans text-base font-semibold tracking-normal text-fg-muted">
            {bg.protectedCheck.reasonsTitle}
          </h2>
          <ul className="verdict-reasons mt-3 flex flex-col gap-3">
            {reasons.slice(0, MAX_REASONS).map((reason) => (
              <li key={reason} className="border-l-2 border-line-strong pl-4">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {level === "red" ? <p className="text-fg-muted">{bg.protectedCheck.praise}</p> : null}
      <Button variant="secondary" size="xl" onClick={onNewCheck}>
        {bg.protectedCheck.newCheck}
      </Button>
    </section>
  );
}
