// SafetyNet: section 3 of the home page as one small client island. Even when nobody
// answers „Ти ли си?“, the 30-second check gives a clear verdict. Two halves:
//   - a drawn phone with the REAL engine demo (CallDemo): pick a sample call or
//     rewrite what the caller says and watch the score change („try to fool it“);
//   - the six hard rules (D10) beside it, straight from the engine's texts. The
//     rules the current example breaks light up (verdict.hardRules), so the visitor
//     sees WHY it is red. Any lit rule always means red.
// The engine is a pure function: nothing is sent anywhere.
"use client";

import { useState } from "react";
import { SAMPLE_CALLS } from "@/content/placeholders";
import { analyseCall, HARD_RULE_IDS } from "@/engine";
import { bg } from "@/i18n/bg";
import { CallDemo } from "./CallDemo";
import { PhoneFrame } from "./PhoneFrame";

const t = bg.landing.safety;

// The call shown first: „Катастрофирах“, the story of the hero, so three rules are lit.
const FIRST_CALL = SAMPLE_CALLS[0];

// `idPrefix` keeps the ids of this section unique on the page.
export function SafetyNet({ idPrefix }: { idPrefix: string }) {
  const [callId, setCallId] = useState(FIRST_CALL?.id ?? "");
  // The text the visitor may have changed, per sample call (like a Python dict).
  const [texts, setTexts] = useState<Record<string, string>>({});

  const call = SAMPLE_CALLS.find((item) => item.id === callId) ?? FIRST_CALL;
  if (call === undefined) return null;
  const text = texts[call.id] ?? call.input.text;
  const verdict = analyseCall({ ...call.input, text });

  return (
    <div className="grid gap-x-10 gap-y-12 lg:grid-cols-12 lg:items-start">
      <div className="lg:col-span-5">
        <PhoneFrame className="landing-phone--demo" data-level={verdict.level}>
          <CallDemo
            call={call}
            text={text}
            verdict={verdict}
            onCallChange={setCallId}
            onTextChange={(value) => setTexts({ ...texts, [call.id]: value })}
          />
        </PhoneFrame>
      </div>
      <div className="lg:sticky lg:top-28 lg:col-span-7">
        <h3 id={`${idPrefix}-rules`} className="text-h3">
          {t.rulesTitle}
        </h3>
        <p className="mt-2 text-fg-muted">{t.rulesHint}</p>
        <ol aria-labelledby={`${idPrefix}-rules`} className="landing-rules mt-6">
          {HARD_RULE_IDS.map((id, index) => {
            const rule = bg.engine.hardRules[id];
            const fired = verdict.hardRules.includes(id);
            return (
              <li key={id} className="landing-rule" data-fired={fired || undefined}>
                <span aria-hidden="true" className="landing-rule-n tabular">
                  {index + 1}
                </span>
                <div>
                  <p className="font-display text-lg leading-tight font-semibold">
                    {rule.name}
                    {fired ? <span className="sr-only"> ({t.ruleFired})</span> : null}
                  </p>
                  <p className="mt-1 text-sm text-fg-muted">{rule.explanation}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
