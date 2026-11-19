// Phase 2 rebuilds this.
// The live demo in the hero of the home page: three sample calls and an editable
// text of what the caller says. The REAL detection engine (src/engine, the same code
// the app and the server use) computes the score, the level and the reasons in the
// browser, and the risk gauge follows it.
//
// The sample calls are examples (src/content/placeholders.ts). Nothing is sent
// anywhere: the engine is a pure function.
"use client";

import { useId, useState } from "react";
import { StatusPill } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { Textarea } from "@/components/ui/Field";
import { RiskMeter } from "@/components/ui/RiskMeter";
import { LEVEL_STATUS } from "@/components/ui/Verdict";
import { fill } from "@/components/family/format";
import { SAMPLE_CALLS } from "@/content/placeholders";
import { analyseCall, MAX_TEXT_LENGTH } from "@/engine";
import { bg } from "@/i18n/bg";

const t = bg.landing.demo;
const MAX_SHOWN_REASONS = 3;

// The small dot in front of each reason, in the verdict's colour.
const DOT = {
  danger: "bg-danger-solid",
  caution: "bg-caution-solid",
  safe: "bg-safe-solid",
  info: "bg-info-solid",
  neutral: "bg-line-strong",
};

export function CallDemo() {
  const groupName = useId();
  const textId = useId();
  const hintId = useId();
  const [callId, setCallId] = useState(SAMPLE_CALLS[0]?.id ?? "");
  // The text the visitor may have changed, per sample call (like a Python dict).
  const [texts, setTexts] = useState<Record<string, string>>({});

  const call = SAMPLE_CALLS.find((item) => item.id === callId) ?? SAMPLE_CALLS[0];
  if (call === undefined) return null;
  const text = texts[call.id] ?? call.input.text;
  const verdict = analyseCall({ ...call.input, text });
  const status = LEVEL_STATUS[verdict.level];
  const reasons = verdict.reasons.slice(0, MAX_SHOWN_REASONS);

  // The answers of the sample call, in the words of the real questions.
  const q = bg.protectedCheck;
  const answers: { question: string; answer: string }[] = [
    {
      question: q.questions.claimedIdentity,
      answer: call.input.claimedIdentity ? q.identities[call.input.claimedIdentity] : t.notAnswered,
    },
    {
      question: q.questions.asksMoney,
      answer: call.input.asksMoney ? q.tri[call.input.asksMoney] : t.notAnswered,
    },
    {
      question: q.questions.rushing,
      answer: call.input.rushing ? q.tri[call.input.rushing] : t.notAnswered,
    },
    {
      question: q.questions.secrecy,
      answer: call.input.secrecy ? q.tri[call.input.secrecy] : t.notAnswered,
    },
  ];

  return (
    <section aria-labelledby={`${textId}-title`} className="glass overflow-hidden rounded-xl">
      <div className="p-5 md:p-6">
        <h2 id={`${textId}-title`} className="font-sans text-base font-semibold tracking-normal">
          {t.title}
        </h2>
        {/* Sample calls: native radios, so the arrow keys move between them. */}
        <div role="radiogroup" aria-label={t.scenarioLabel} className="mt-4 flex flex-wrap gap-2">
          {SAMPLE_CALLS.map((item) => (
            <label
              key={item.id}
              className="pressable relative flex min-h-11 cursor-pointer items-center rounded-full border border-glass-line px-4 text-sm font-medium text-fg-muted hover:text-fg has-checked:border-transparent has-checked:bg-primary has-checked:text-on-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
            >
              <input
                type="radio"
                name={groupName}
                value={item.id}
                checked={item.id === call.id}
                onChange={() => setCallId(item.id)}
                className="absolute inset-0 size-full cursor-pointer appearance-none rounded-full opacity-0"
              />
              {item.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 px-5 pb-5 md:grid-cols-2 md:px-6 md:pb-6">
        <div>
          <label htmlFor={textId} className="text-sm font-semibold text-fg">
            {t.textLabel}
          </label>
          <Textarea
            id={textId}
            rows={6}
            maxLength={MAX_TEXT_LENGTH}
            value={text}
            onChange={(event) => setTexts({ ...texts, [call.id]: event.target.value })}
            aria-describedby={hintId}
            className="mt-2 text-base"
          />
          <p id={hintId} className="mt-2 text-sm text-fg-muted">
            {t.textHint}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-fg">{t.answersLabel}</p>
          <div className="mt-2">
            {answers.map((row) => (
              <p
                key={row.question}
                className="flex items-baseline justify-between gap-4 border-b border-line py-2 text-sm"
              >
                <span className="text-fg-muted">{row.question}</span>
                <span className="shrink-0 font-semibold text-fg">{row.answer}</span>
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* The readout. aria-live: a screen reader hears the new result after a change. */}
      <div className="border-t border-line bg-glass-1 p-5 md:p-6" aria-live="polite">
        <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,15rem)_1fr]">
          <RiskMeter score={verdict.score} level={verdict.level} label={t.riskLabel} />
          <div>
            <p className="flex items-baseline gap-3">
              <span className="text-sm text-fg-muted">{t.riskLabel}</span>
              <span className="sr-only">{fill(t.scoreOf, { score: verdict.score })}</span>
            </p>
            <StatusPill status={status} className="mt-1 text-base">
              {bg.verdictBadge[verdict.level]}
            </StatusPill>
            <div className="mt-5 min-h-[7.5rem]">
              <p className="text-sm font-semibold text-fg-muted">{t.reasonsTitle}</p>
              {reasons.length === 0 ? (
                <p className="mt-1.5 text-sm text-fg-muted">{t.noReasons}</p>
              ) : (
                reasons.map((reason) => (
                  <p key={reason.code} className="mt-2 flex items-start gap-2.5 text-sm text-fg">
                    <span
                      aria-hidden="true"
                      className={cn("mt-[0.55em] size-1.5 shrink-0 rounded-full", DOT[status])}
                    />
                    {reason.textBg}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-fg-muted">{t.engineNote}</p>
      </div>
    </section>
  );
}
