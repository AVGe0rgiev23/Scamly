// The result screen of the call check: the verdict in big plain words (Roberta's
// Verdict: headline, advice and up to 4 reasons), the big „Обади се на Иван“ button
// and „Нова проверка“.
//
// Red starts with praise, „Добре направихте, че проверихте.“ (IDEAS #8), then the
// clear instruction „Затворете телефона.“: a calm, kind voice helps a frightened
// person act. Green shows exactly the D9 wording and never says "safe".

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
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
  onNewCheck: () => void;
};

export function CheckResult({
  level,
  reasons,
  callContact,
  afterCall,
  onNewCheck,
}: CheckResultProps) {
  const heading = useRef<HTMLHeadingElement>(null);

  // The result replaces the question screen: move the focus to the headline, so a
  // screen reader reads it at once and the page starts at the top.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section className={`check-result check-result-${level}`}>
      {level === "red" ? <p className="check-praise">{bg.protectedCheck.praise}</p> : null}
      <Verdict
        level={level}
        headingLevel={1}
        headingRef={heading}
        lead={level === "red" && !afterCall ? bg.protectedCheck.hangUp : undefined}
        reasons={reasons.slice(0, MAX_REASONS)}
        reasonsTitle={bg.protectedCheck.reasonsTitle}
      />
      {callContact === null ? null : <CallContactButton contact={callContact} />}
      <Button variant="secondary" onClick={onNewCheck}>
        {bg.protectedCheck.newCheck}
      </Button>
    </section>
  );
}
