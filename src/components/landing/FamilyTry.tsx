// FamilyTry: „Опитайте: вие сте Иван“ in the family section of the home page. A drawn
// phone with the family member's real answer screen („Ти ли си?“ and the two big
// buttons, the app's own texts). Here the buttons really work, but only on this page:
//   „Не съм аз — обаждам ти се сега!“ → what Иван sees next, and that the rest of the
//                                        family (Ана, Георги) was warned (#38);
//   „Аз съм“                           → the calm answer, with the reminder that the
//                                        hard rules still apply (D9: never "safe").
// „Отначало“ goes back (keyboard focus follows). Nothing is sent anywhere. The result is a polite live region.
"use client";

import { RotateCcw, ShieldAlert, UserCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fill } from "@/components/family/format";
import { SAMPLE } from "@/content/placeholders";
import { bg } from "@/i18n/bg";
import { PhoneFrame } from "./PhoneFrame";

const answer = bg.identityAnswer;
const mom = SAMPLE.momInSentence;

// What the visitor chose; null = the question is still open (like Optional[str]).
type Choice = "not_me" | "its_me" | null;

export function FamilyTry() {
  const [choice, setChoice] = useState<Choice>(null);
  // The answer buttons disappear after a press; keyboard focus moves to „Отначало“
  // (a ref keeps the real button between renders).
  const againRef = useRef<HTMLButtonElement>(null);
  const pressed = useRef(false);
  useEffect(() => {
    if (choice !== null && pressed.current) againRef.current?.focus();
  }, [choice]);
  function choose(value: Choice) {
    pressed.current = true;
    setChoice(value);
  }

  return (
    <div>
      <p className="mb-4 text-center text-sm font-semibold text-fg-muted">
        {bg.landing.family.tryLabel}
      </p>
      <PhoneFrame
        className="landing-phone--try"
        data-level={choice === "not_me" ? "red" : undefined}
      >
        <div className="flex min-h-[26rem] flex-col px-5 pt-4 pb-6">
          <p className="eyebrow">{answer.eyebrow}</p>
          <p className="mt-2 font-display text-[2rem] leading-none font-bold">{answer.title}</p>
          <p className="mt-3 text-fg-muted">{fill(answer.question, { person: mom })}</p>
          <div aria-live="polite" className="mt-auto pt-6">
            {choice === null ? (
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  className="landing-answer landing-answer--no pressable"
                  onClick={() => choose("not_me")}
                >
                  <ShieldAlert className="size-6 shrink-0" aria-hidden="true" />
                  {answer.notMe}
                </button>
                <button
                  type="button"
                  className="landing-answer pressable"
                  onClick={() => choose("its_me")}
                >
                  <UserCheck className="size-6 shrink-0" aria-hidden="true" />
                  {answer.itsMe}
                </button>
              </div>
            ) : (
              <div className="appear">
                {choice === "not_me" ? (
                  <>
                    <p className="font-display text-lg leading-snug font-semibold">
                      {fill(answer.answeredNotMe, { person: mom })}
                    </p>
                    <p className="mt-3 text-sm text-fg-muted">{bg.landing.family.warnedLabel}</p>
                    <ul className="mt-1.5 flex flex-col gap-1.5">
                      {SAMPLE.otherFamily.map((name) => (
                        <li key={name} className="landing-warned">
                          <span className="font-semibold">{name}</span>
                          <span className="text-fg-muted">
                            {fill(bg.identityChecks.warnTitle, { name: SAMPLE.familyName })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="font-display text-lg leading-snug font-semibold">
                      {fill(answer.answeredItsMe, { person: mom })}
                    </p>
                    <p className="mt-3 text-sm text-fg-muted">{bg.identityAsk.itsMeLead}</p>
                    <p className="mt-1 text-sm font-semibold">{bg.identityAsk.rules[0]}</p>
                  </>
                )}
                <button
                  ref={againRef}
                  type="button"
                  onClick={() => setChoice(null)}
                  className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full px-3 font-semibold text-fg underline decoration-line-strong underline-offset-4"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  {bg.landing.family.again}
                </button>
              </div>
            )}
          </div>
        </div>
      </PhoneFrame>
    </div>
  );
}
