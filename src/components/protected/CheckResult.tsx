// The result screen of the call check: the verdict moment, the big „Обади се на Иван“
// button, the reasons and „Нова проверка“.
//
// The moment (protected.css, section "Verdict"):
//   red:    the screen floods from the centre with deep red (a growing clip-path
//           circle), the halo ring closes into a shield with one shockwave, „ТОВА Е
//           ИЗМАМА.“ lands with weight and the phone vibrates once (200-100-200 ms)
//           where it can. Red always uses the dark colours, in both themes, so white
//           text sits on deep red.
//   yellow: a softer amber flood and uneven, wavering rings: „Внимание!“.
//   green:  a calm mint glow from the top, two breathing rings and exactly the D9
//           words (bg.verdict.green); never "safe".
// With reduced motion the colour is there at once, nothing moves and nothing vibrates.
//
// Red leads with the risk and the instruction „Затворете телефона.“ The call action
// comes before the explanation and the reassurance („Добре направихте, че
// проверихте.“). The reasons appear one by one below.
//
// When a family member presses „Обаждам ѝ се сега“, „Иван ще ви се обади веднага.“
// arrives at the top as a Dynamic Island (CallCheck watches the check live).

import { PhoneCall } from "lucide-react";
import { useEffect, useRef, type CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import type { RiskLevel } from "@/engine";
import { bg } from "@/i18n/bg";
import type { CallContactDto } from "@/schemas/checks";
import { CallContactButton } from "./CallContactButton";
import { FamilyIsland } from "./FamilyIsland";
import { VerdictEmblem } from "./VerdictEmblem";

// How many "why" lines we show: more would be too much to read in a hurry.
export const MAX_REASONS = 4;

// The phone's vibration for a red verdict: buzz, pause, buzz (in ms).
const RED_VIBRATION = [200, 100, 200];

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
  const vibrated = useRef(false);
  const text = bg.verdict[level];

  // The result replaces the question screen: the page starts at the top (where the
  // flood begins) and the focus moves to the headline, so a screen reader reads it
  // at once.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, []);

  // Red: vibrate ONCE (not when the server's verdict later replaces the phone's own,
  // and never with reduced motion). Phones without vibration simply skip it.
  useEffect(() => {
    if (level !== "red" || vibrated.current) return;
    vibrated.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof navigator.vibrate === "function") navigator.vibrate(RED_VIBRATION);
  }, [level]);

  return (
    <section
      className="check-result flex flex-col gap-6"
      data-level={level}
      // Red always uses the dark colours (white words on deep red), in both themes.
      data-theme={level === "red" ? "dark" : undefined}
    >
      {/* The flood behind the whole screen. key: a new level floods again. */}
      <span key={`flood-${level}`} className="check-flood" data-level={level} aria-hidden="true" />

      {/* role="status": a live region, there from the start, so a screen reader reads
          the family message aloud the moment it appears. On screen it is the island. */}
      <div role="status" className="check-island-slot">
        {familyMessage === null ? null : <FamilyIsland message={familyMessage} />}
      </div>

      <header
        key={`verdict-${level}`}
        className="check-verdict flex flex-col items-center text-center"
      >
        <VerdictEmblem level={level} />
        <h1 ref={heading} tabIndex={-1} className="check-verdict-title">
          {text.title}
        </h1>
        {level === "red" && !afterCall ? (
          <p className="check-verdict-lead check-rise">{bg.protectedCheck.hangUp}</p>
        ) : null}
      </header>

      {callContact === null ? null : (
        <div className="check-rise check-rise-2">
          <CallContactButton contact={callContact} hero />
        </div>
      )}

      <p className="check-verdict-advice check-rise check-rise-2">{text.description}</p>

      {local ? (
        <Notice status="caution" className="check-rise check-rise-3 text-lg">
          {bg.protectedCheck.localNote}
        </Notice>
      ) : null}

      <div role="status">
        {suggestEmergencyCall ? (
          <p className="appear flex items-start gap-3 rounded-lg border border-caution-line bg-caution-bg p-5 font-display text-h3 font-bold text-fg">
            <PhoneCall className="mt-[0.1em] size-7 shrink-0 text-caution-fg" aria-hidden="true" />
            {bg.protectedCheck.emergencyCallAdvice}
          </p>
        ) : null}
      </div>

      {reasons.length ? (
        <div className="check-reasons check-rise check-rise-3">
          <h2 className="font-sans text-lg font-semibold tracking-normal text-fg-muted">
            {bg.protectedCheck.reasonsTitle}
          </h2>
          <ul className="verdict-reasons mt-3 flex flex-col gap-3">
            {reasons.slice(0, MAX_REASONS).map((reason, position) => (
              <li
                key={reason}
                className="check-reason"
                // The position, for the one-by-one delay (a CSS variable).
                style={{ "--i": position } as CSSProperties}
              >
                <span className="check-reason-dot" aria-hidden="true" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {level === "red" ? (
        <p className="check-praise check-rise check-rise-3">{bg.protectedCheck.praise}</p>
      ) : null}

      <Button
        variant="secondary"
        size="xl"
        className="check-rise check-rise-3"
        onClick={onNewCheck}
      >
        {bg.protectedCheck.newCheck}
      </Button>
    </section>
  );
}
