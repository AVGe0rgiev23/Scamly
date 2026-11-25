// A scripted call drill that reuses the question UI and keeps answers in memory.
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { bg } from "@/i18n/bg";
import { QuestionWizard } from "./QuestionWizard";
import { EMPTY_ANSWERS, questionOrder, withAnswer, type QuestionId } from "./questions";

// The expected answers describe the same fictional scenario as the Bulgarian copy.
const EXAMPLE_ANSWERS = {
  claimedIdentity: "police",
  asksMoney: "yes",
  handover: "courier_or_stranger",
  rushing: "yes",
  secrecy: "yes",
} as const;

export function PracticeCall({ onExit }: { onExit: () => void }) {
  const copy = bg.practice;
  const [answers, setAnswers] = useState(EMPTY_ANSWERS);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<"intro" | "questions" | "result">("intro");
  const intro = useRef<HTMLHeadingElement>(null);
  const result = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step === "intro") intro.current?.focus();
    if (step === "result") result.current?.focus();
  }, [step]);

  function advance(current = answers) {
    if (index + 1 < questionOrder(current).length) setIndex(index + 1);
    else setStep("result");
  }

  function pick(id: QuestionId, value: string) {
    const next = withAnswer(answers, id, value);
    setAnswers(next);
    advance(next);
  }

  function restart() {
    setAnswers(EMPTY_ANSWERS);
    setIndex(0);
    setStep("intro");
  }

  const recognized = questionOrder({ ...EMPTY_ANSWERS, ...EXAMPLE_ANSWERS }).every(
    (id) => answers[id] === EXAMPLE_ANSWERS[id],
  );

  return (
    <section className="flex flex-col gap-5" aria-label={copy.title}>
      <Notice title={copy.title}>{copy.noAlert}</Notice>
      {step === "intro" ? (
        <>
          <h1 className="check-question" ref={intro} tabIndex={-1}>
            {copy.intro}
          </h1>
          <p className="surface-raised rounded-xl p-5">{copy.caller}</p>
          <Button size="xl" onClick={() => setStep("questions")}>
            {copy.start}
          </Button>
        </>
      ) : null}
      {step === "questions" ? (
        <>
          <p className="text-lg text-fg-muted">{copy.caller}</p>
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
      {step === "result" ? (
        <>
          <h1 className="check-question" ref={result} tabIndex={-1}>
            {copy.resultTitle}
          </h1>
          <p>{recognized ? copy.recognized : copy.review}</p>
          <div className="surface-raised space-y-3 rounded-xl p-5">
            <p>{copy.explanation}</p>
            <p className="font-semibold">{copy.action}</p>
          </div>
          <Button size="xl" onClick={restart}>
            {copy.retry}
          </Button>
        </>
      ) : null}
      <Button variant="secondary" size="xl" onClick={onExit}>
        {copy.exit}
      </Button>
    </section>
  );
}
