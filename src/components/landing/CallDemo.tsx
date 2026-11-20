// The live demo on the hero's phone: three sample calls and an editable text of what
// the caller says. The REAL detection engine (src/engine, the same code the app and the
// server use) computes the score, the level and the reasons; HeroStage.tsx runs it and
// passes the result here, because the hero's halo reacts to the same verdict.
// This file only draws the phone screen (a controlled component: the state lives in
// the parent, like a Python function that gets its data as arguments).
//
// The sample calls are examples (src/content/placeholders.ts). Nothing is sent
// anywhere: the engine is a pure function.
"use client";

import { useId } from "react";
import { StatusPill } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { Textarea } from "@/components/ui/Field";
import { RiskMeter } from "@/components/ui/RiskMeter";
import { LEVEL_STATUS } from "@/components/ui/Verdict";
import { fill } from "@/components/family/format";
import { SAMPLE_CALLS, type SampleCall } from "@/content/placeholders";
import { MAX_TEXT_LENGTH, type Verdict } from "@/engine";
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

type CallDemoProps = {
  call: SampleCall;
  text: string;
  verdict: Verdict;
  onCallChange: (id: string) => void;
  onTextChange: (text: string) => void;
};

export function CallDemo({ call, text, verdict, onCallChange, onTextChange }: CallDemoProps) {
  const groupName = useId();
  const textId = useId();
  const hintId = useId();
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
    <section aria-labelledby={`${textId}-title`} className="px-4 pt-3 pb-5">
      <h2 id={`${textId}-title`} className="font-sans text-base font-semibold tracking-normal">
        {t.title}
      </h2>
      {/* Sample calls: native radios, so the arrow keys move between them. */}
      <div role="radiogroup" aria-label={t.scenarioLabel} className="mt-3 flex flex-wrap gap-1.5">
        {SAMPLE_CALLS.map((item) => (
          <label
            key={item.id}
            className="pressable relative flex min-h-11 cursor-pointer items-center rounded-full border border-glass-line bg-glass-1 px-3.5 text-sm font-medium text-fg-muted hover:text-fg has-checked:border-transparent has-checked:bg-primary has-checked:text-on-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
          >
            <input
              type="radio"
              name={groupName}
              value={item.id}
              checked={item.id === call.id}
              onChange={() => onCallChange(item.id)}
              className="absolute inset-0 size-full cursor-pointer appearance-none rounded-full opacity-0"
            />
            {item.label}
          </label>
        ))}
      </div>

      {/* The readout. aria-live: a screen reader hears the new result after a change. */}
      <div
        className="surface-raised mt-4 rounded-lg px-3 pt-3 pb-4"
        aria-live="polite"
        data-level={verdict.level}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-fg-muted">
            {t.riskLabel}
            <span className="sr-only">: {fill(t.scoreOf, { score: verdict.score })}</span>
          </p>
          <StatusPill status={status} className="text-sm">
            {bg.verdictBadge[verdict.level]}
          </StatusPill>
        </div>
        <RiskMeter
          score={verdict.score}
          level={verdict.level}
          label={t.riskLabel}
          className="mt-1 max-w-[11.5rem]"
        />
        <div className="mt-3 min-h-[5.75rem] border-t border-line pt-2.5">
          <p className="text-xs font-semibold text-fg-muted">{t.reasonsTitle}</p>
          {reasons.length === 0 ? (
            <p className="mt-1 text-sm text-fg-muted">{t.noReasons}</p>
          ) : (
            reasons.map((reason) => (
              <p
                key={reason.code}
                className="mt-1.5 flex items-start gap-2 text-sm leading-snug text-fg"
              >
                <span
                  aria-hidden="true"
                  className={cn("mt-[0.5em] size-1.5 shrink-0 rounded-full", DOT[status])}
                />
                {reason.textBg}
              </p>
            ))
          )}
        </div>
      </div>

      <label htmlFor={textId} className="mt-4 block text-sm font-semibold text-fg">
        {t.textLabel}
      </label>
      <Textarea
        id={textId}
        rows={3}
        maxLength={MAX_TEXT_LENGTH}
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        aria-describedby={hintId}
        className="mt-1.5 text-sm"
      />
      <p id={hintId} className="mt-1.5 text-xs text-fg-muted">
        {t.textHint}
      </p>

      <p className="mt-4 text-sm font-semibold text-fg">{t.answersLabel}</p>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        {answers.map((row) => (
          <p key={row.question} className="rounded-md bg-glass-1 px-2.5 py-2 text-xs leading-snug">
            <span className="block text-fg-muted">{row.question}</span>
            <span className="mt-0.5 block font-semibold text-fg">{row.answer}</span>
          </p>
        ))}
      </div>
      <p className="mt-3 text-xs text-fg-muted">{t.engineNote}</p>
    </section>
  );
}
