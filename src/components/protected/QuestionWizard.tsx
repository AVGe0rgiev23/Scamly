// The questions of the call check, ONE per screen: a big heading, „Въпрос 2 от 4“,
// big answers with pictures (native radios via BigChoice) and „Назад“ / „Напред“.
// One tap on an answer goes on to the next question; with the keyboard the arrow
// keys only choose, and „Напред“ goes on (so the choice can't jump by accident).

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { fill } from "@/components/family/format";
import { BigChoice } from "@/components/ui/BigChoice";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { bg } from "@/i18n/bg";
import { withIcons } from "./answerIcons";
import {
  QUESTION_TEXT,
  answerOf,
  optionsFor,
  questionOrder,
  type CheckAnswers,
  type QuestionId,
} from "./questions";

type QuestionWizardProps = {
  answers: CheckAnswers;
  index: number; // which question of questionOrder(answers) is shown, from 0
  onAnswer: (id: QuestionId, value: string) => void; // chosen (also with the arrow keys)
  onPick: (id: QuestionId, value: string) => void; // tapped: go on to the next question
  onNext: () => void;
  onBack: () => void;
};

export function QuestionWizard({
  answers,
  index,
  onAnswer,
  onPick,
  onNext,
  onBack,
}: QuestionWizardProps) {
  const order = questionOrder(answers);
  // `?? …`: if the index is ever past the end, show the first question (like
  // Python's dict.get(key, default)).
  const id = order[index] ?? "claimedIdentity";
  const value = answerOf(answers, id);
  const heading = useRef<HTMLHeadingElement>(null);

  // A new question: move the focus to its heading, so a screen reader reads it and
  // the page starts at the top (like a new page).
  useEffect(() => {
    heading.current?.focus();
  }, [id]);

  const total = order.length;
  return (
    <section className="flex flex-col gap-6" aria-labelledby="check-question">
      <div>
        <p className="tabular font-mono text-sm text-fg-muted">
          {fill(bg.protectedCheck.progress, { current: index + 1, total })}
        </p>
        {/* The step ruler: one segment per question, the answered ones filled. */}
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {order.map((step, position) => (
            <span
              key={step}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                position <= index ? "bg-accent" : "bg-surface-3",
              )}
            />
          ))}
        </div>
      </div>
      <h1 id="check-question" className="text-h1" ref={heading} tabIndex={-1}>
        {QUESTION_TEXT[id]}
      </h1>
      <BigChoice
        // key: a new question gets a fresh group of radios (and a fresh tap memory).
        key={id}
        question={QUESTION_TEXT[id]}
        hideQuestion
        size="large"
        options={withIcons(optionsFor(id))}
        value={value}
        onChange={(answer) => onAnswer(id, answer)}
        onPick={(answer) => onPick(id, answer)}
      />
      <div className="flex gap-3">
        {index > 0 ? (
          <Button variant="secondary" size="xl" onClick={onBack}>
            <ArrowLeft className="size-6" aria-hidden="true" />
            {bg.protectedCheck.back}
          </Button>
        ) : null}
        <Button size="xl" className="flex-1" onClick={onNext} disabled={value === null}>
          {bg.protectedCheck.next}
          <ArrowRight className="size-6" aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
