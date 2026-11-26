// The two answers of the real family member on the older person's phone (P-06).
// Both reuse the verdict moment of the check (protected.css section 4–5: the flood,
// VerdictEmblem, the landing title, the rise waves), so they look like a verdict.
//
//   IdentityNotMe  „Не съм аз“: the red flood. „Това НЕ е Иван. Затворете телефона.
//                  Иван ви звъни сега.“, the words to end the call (#4), the call-back
//                  button to the SAVED number (claimedPhone, never the calling number)
//                  and „Някой идва ли към вас за парите?“ → „Обадете се на 112“ (#44).
//   IdentityItsMe  „Аз съм“: the calm mint glow and the hard rules that still apply
//                  (D10). Green never says "safe" (D9).

import { Phone } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { fill } from "@/components/family/format";
import { BigChoice } from "@/components/ui/BigChoice";
import { Button, buttonClass } from "@/components/ui/Button";
import { bg } from "@/i18n/bg";
import { withIcons } from "./answerIcons";
import { CallContactButton } from "./CallContactButton";
import type { IdentityAskState } from "./useIdentityAsk";
import { VerdictEmblem } from "./VerdictEmblem";

// The same buzz as a red verdict (CheckResult): buzz, pause, buzz (ms).
const RED_VIBRATION = [200, 100, 200];

const YES_NO = withIcons([
  { value: "yes", label: bg.protectedCheck.tri.yes },
  { value: "no", label: bg.protectedCheck.tri.no },
]);

// The new screen starts at the top and the focus goes to its headline.
function useHeadlineFocus() {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, []);
  return heading;
}

// The name of the person who answered, as the contact list calls them.
function answeredName(state: IdentityAskState): string {
  return state.answer?.claimedName ?? state.current.displayName;
}

export function IdentityNotMe({ state, onDone }: { state: IdentityAskState; onDone: () => void }) {
  const heading = useHeadlineFocus();
  const [coming, setComing] = useState<string | null>(null);
  const name = answeredName(state);
  // ONLY the number saved in the family's contact list (D34).
  const phone = state.answer?.claimedPhone ?? null;

  // Vibrate once, never with reduced motion (like the red verdict).
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof navigator.vibrate === "function") navigator.vibrate(RED_VIBRATION);
  }, []);

  return (
    <section className="check-result flex flex-col gap-6" data-level="red" data-theme="dark">
      <span className="check-flood" data-level="red" aria-hidden="true" />
      <header className="check-verdict flex flex-col items-center text-center">
        <VerdictEmblem level="red" />
        <h1 ref={heading} tabIndex={-1} className="check-verdict-title">
          {fill(bg.identityAsk.notMeTitle, { name })}
        </h1>
        <p className="check-verdict-lead check-rise">{bg.protectedCheck.hangUp}</p>
        <p className="check-rise mt-3 text-lg text-fg">
          {bg.protectedCheck.hangUpPhraseLabel} <strong>{bg.protectedCheck.hangUpPhrase}</strong>
        </p>
        <p className="check-verdict-advice check-rise check-rise-2 mt-4">
          {fill(bg.identityAsk.callsYou, { name })}
        </p>
      </header>

      {phone === null ? null : (
        <div className="check-rise check-rise-2">
          <CallContactButton contact={{ displayName: name, phone }} hero />
        </div>
      )}

      <div className="check-ask-coming check-rise check-rise-3 flex flex-col gap-4">
        <h2 className="check-ask-coming-title">{bg.identityAsk.comingQuestion}</h2>
        <BigChoice
          question={bg.identityAsk.comingQuestion}
          hideQuestion
          size="large"
          options={YES_NO}
          value={coming}
          onChange={setComing}
        />
        {coming === "yes" ? (
          <a className={buttonClass("danger", "xl", "check-ask-112 w-full")} href="tel:112">
            <Phone className="size-7 shrink-0" aria-hidden="true" />
            {bg.identityAsk.call112}
          </a>
        ) : null}
        {coming === "no" ? <p className="text-xl">{bg.identityAsk.notComing}</p> : null}
      </div>

      <Button variant="secondary" size="xl" className="check-rise check-rise-3" onClick={onDone}>
        {bg.identityAsk.toStart}
      </Button>
    </section>
  );
}

export function IdentityItsMe({
  state,
  onContinue,
  onDone,
}: {
  state: IdentityAskState;
  onContinue: () => void;
  onDone: () => void;
}) {
  const heading = useHeadlineFocus();
  const name = answeredName(state);
  return (
    <section className="check-result flex flex-col gap-6" data-level="green">
      <span className="check-flood" data-level="green" aria-hidden="true" />
      <header className="check-verdict flex flex-col items-center text-center">
        <VerdictEmblem level="green" />
        <h1 ref={heading} tabIndex={-1} className="check-verdict-title">
          {fill(bg.identityAsk.itsMeTitle, { name })}
        </h1>
      </header>
      <div className="check-reasons check-rise check-rise-2">
        <h2 className="text-xl font-semibold">{bg.identityAsk.itsMeLead}</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {bg.identityAsk.rules.map((rule, position) => (
            <li key={rule} className="check-reason" style={{ "--i": position } as CSSProperties}>
              <span className="check-reason-dot" aria-hidden="true" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="check-verdict-advice check-rise check-rise-3">{bg.verdict.green.description}</p>
      <div className="check-rise check-rise-3 flex flex-col gap-3">
        <Button size="xl" onClick={onContinue}>
          {bg.identityAsk.backToCheck}
        </Button>
        <Button variant="secondary" size="xl" onClick={onDone}>
          {bg.identityAsk.toStart}
        </Button>
      </div>
    </section>
  );
}
