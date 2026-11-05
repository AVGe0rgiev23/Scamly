// The questions of the call check, ONE per screen: a big heading, „Въпрос 2 от 4“,
// big answers with pictures (native radios via BigChoice) and „Назад“ / „Напред“.
// One tap on an answer goes on to the next question; with the keyboard the arrow
// keys only choose, and „Напред“ goes on (so the choice can't jump by accident).

import { useEffect, useRef } from "react";
import { fill } from "@/components/family/format";
import { BigChoice } from "@/components/ui/BigChoice";
import { Button } from "@/components/ui/Button";
import { bg } from "@/i18n/bg";
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

  return (
    <section className="check-step" aria-labelledby="check-question">
      <p className="check-progress">
        {fill(bg.protectedCheck.progress, { current: index + 1, total: order.length })}
      </p>
      <h1 id="check-question" className="check-heading" ref={heading} tabIndex={-1}>
        {QUESTION_TEXT[id]}
      </h1>
      <BigChoice
        // key: a new question gets a fresh group of radios (and a fresh tap memory).
        key={id}
        question={QUESTION_TEXT[id]}
        hideQuestion
        size="large"
        options={optionsFor(id)}
        value={value}
        onChange={(answer) => onAnswer(id, answer)}
        onPick={(answer) => onPick(id, answer)}
      />
      <div className="check-nav">
        {index > 0 ? (
          <Button variant="secondary" onClick={onBack}>
            <span aria-hidden="true">← </span>
            {bg.protectedCheck.back}
          </Button>
        ) : null}
        <Button onClick={onNext} disabled={value === null}>
          {bg.protectedCheck.next}
          <span aria-hidden="true"> →</span>
        </Button>
      </div>
    </section>
  );
}
