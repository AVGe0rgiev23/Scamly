// A scripted call drill that reuses the question UI and keeps answers in memory.
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { bg } from "@/i18n/bg";
import { QuestionWizard } from "./QuestionWizard";
import {
  EMPTY_ANSWERS,
  questionOrder,
  withAnswer,
  type CheckAnswers,
  type QuestionId,
} from "./questions";

const SCENARIOS = ["police", "relative"] as const;
const NEXT_ACTIONS = ["send", "verify", "callback"] as const;
type Scenario = (typeof SCENARIOS)[number];

// Like a Python dict of answer keys for the fictional passages in bg.ts.
const EXPECTED_ANSWERS: Record<Scenario, CheckAnswers> = {
  police: {
    ...EMPTY_ANSWERS,
    claimedIdentity: "police",
    asksMoney: "yes",
    handover: "courier_or_stranger",
    rushing: "yes",
    secrecy: "yes",
  },
  relative: {
    ...EMPTY_ANSWERS,
    claimedIdentity: "relative",
    asksMoney: "yes",
    handover: "bank_transfer",
    rushing: "yes",
    secrecy: "yes",
  },
};

export function PracticeCall({ onExit }: { onExit: () => void }) {
  const copy = bg.practice;
  const [answers, setAnswers] = useState(EMPTY_ANSWERS);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<"intro" | "questions" | "action" | "result">("intro");
  const [correctAction, setCorrectAction] = useState(false);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const scenarioCopy = scenario === null ? null : copy.scenarios[scenario];
  const intro = useRef<HTMLHeadingElement>(null);
  const actionHeading = useRef<HTMLHeadingElement>(null);
  const result = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step === "intro") intro.current?.focus();
    if (step === "action") actionHeading.current?.focus();
    if (step === "result") result.current?.focus();
  }, [step, scenario]);

  function advance(current = answers) {
    if (index + 1 < questionOrder(current).length) setIndex(index + 1);
    else setStep("action");
  }

  function pick(id: QuestionId, value: string) {
    const next = withAnswer(answers, id, value);
    setAnswers(next);
    advance(next);
  }

  function restart() {
    setAnswers(EMPTY_ANSWERS);
    setIndex(0);
    setCorrectAction(false);
    setStep("intro");
  }

  const expected = scenario === null ? null : EXPECTED_ANSWERS[scenario];
  const recognized =
    expected !== null && questionOrder(expected).every((id) => answers[id] === expected[id]);

  return (
    <section className="flex flex-col gap-5" aria-label={copy.title}>
      <Notice title={copy.title}>{copy.noAlert}</Notice>
      {scenarioCopy === null ? (
        <>
          <h1 className="check-question" ref={intro} tabIndex={-1}>
            {copy.choose}
          </h1>
          {SCENARIOS.map((item) => (
            <Button key={item} variant="secondary" size="xl" onClick={() => setScenario(item)}>
              {copy.scenarios[item].title}
            </Button>
          ))}
        </>
      ) : null}
      {scenarioCopy !== null && step === "intro" ? (
        <>
          <h1 className="check-question" ref={intro} tabIndex={-1}>
            {copy.intro}
          </h1>
          <p className="surface-raised rounded-xl p-5">{scenarioCopy.caller}</p>
          <Button size="xl" onClick={() => setStep("questions")}>
            {copy.start}
          </Button>
        </>
      ) : null}
      {scenarioCopy !== null && step === "questions" ? (
        <>
          <p className="text-lg text-fg-muted">{scenarioCopy.caller}</p>
          <QuestionWizard
            answers={answers}
            index={index}
            onAnswer={(id, value) => setAnswers((previous) => withAnswer(previous, id, value))}
            onPick={pick}
            onNext={() => advance()}
            onBack={() => (index === 0 ? setStep("intro") : setIndex(index - 1))}
          />
        </>
      ) : null}
      {scenarioCopy !== null && step === "action" ? (
        <>
          <h1 className="check-question" ref={actionHeading} tabIndex={-1}>
            {copy.nextActionQuestion}
          </h1>
          {NEXT_ACTIONS.map((action) => (
            <Button
              key={action}
              variant="secondary"
              size="xl"
              onClick={() => {
                setCorrectAction(action === "verify");
                setStep("result");
              }}
            >
              {scenarioCopy.nextActions[action]}
            </Button>
          ))}
          <Button variant="secondary" size="xl" onClick={() => setStep("questions")}>
            {bg.protectedCheck.back}
          </Button>
        </>
      ) : null}
      {scenarioCopy !== null && step === "result" ? (
        <>
          <h1 className="check-question" ref={result} tabIndex={-1}>
            {copy.resultTitle}
          </h1>
          <p className="font-semibold">{correctAction ? copy.correctAction : copy.reviewAction}</p>
          <p>{recognized ? copy.recognized : copy.review}</p>
          <div className="surface-raised space-y-3 rounded-xl p-5">
            <p>{scenarioCopy.explanation}</p>
            <p>
              {bg.protectedCheck.hangUpPhraseLabel}{" "}
              <strong>{bg.protectedCheck.hangUpPhrase}</strong>
            </p>
            <p className="font-semibold">{scenarioCopy.action}</p>
          </div>
          <Button size="xl" onClick={restart}>
            {copy.retry}
          </Button>
        </>
      ) : null}
      {scenarioCopy !== null && (step === "intro" || step === "result") ? (
        <Button
          variant="secondary"
          size="xl"
          onClick={() => {
            restart();
            setScenario(null);
          }}
        >
          {copy.chooseAnother}
        </Button>
      ) : null}
      <Button variant="secondary" size="xl" onClick={onExit}>
        {copy.exit}
      </Button>
    </section>
  );
}
