// The questions of the call check, ONE per screen: halo dots for the progress (with
// „Въпрос 2 от 4“ written under them), a big heading, big answer tiles with our own
// line icons (native radios via BigChoice) and „Назад“ / „Напред“ at the bottom,
// where the thumb is. One tap on an answer goes on to the next question; with the
// keyboard the arrow keys only choose, and „Напред“ goes on (so the choice can't
// jump by accident).
//
// A new question slides in 24 px from the side it comes from, with a fade
// (protected.css .check-step); with reduced motion it only fades (150 ms).

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fill } from "@/components/family/format";
import { BigChoice } from "@/components/ui/BigChoice";
import { Button } from "@/components/ui/Button";
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

// The progress as halo dots: the answered ones filled with the halo, the current one
// bigger with a soft halo ring, the ones still to come empty rings. Decoration only;
// the words „Въпрос 2 от 4“ under them say the same thing.
function HaloDots({ total, index }: { total: number; index: number }) {
  // Array.from({ length: n }, …) is like Python's [f(i) for i in range(n)].
  const dots = Array.from({ length: total }, (_, position) => {
    if (position < index) return "done";
    if (position === index) return "current";
    return "todo";
  });
  return (
    <span className="check-dots" aria-hidden="true">
      {dots.map((state, position) => (
        <span key={position} className="check-dot" data-state={state} />
      ))}
    </span>
  );
}

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

  // Which way the step slides: forward (from the right) or back (from the left).
  // Remembered with the index it belongs to and updated while rendering when the
  // index changes (React's "adjust state when a prop changes" pattern), so it is
  // already right in the first frame of the new question.
  const [slide, setSlide] = useState({ index, back: false });
  if (slide.index !== index) {
    setSlide({ index, back: index < slide.index });
  }

  // A new question: move the focus to its heading, so a screen reader reads it and
  // the page starts at the top (like a new page).
  useEffect(() => {
    heading.current?.focus();
  }, [id]);

  const total = order.length;
  return (
    <section className="check-questions flex flex-col gap-6" aria-labelledby="check-question">
      <div className="flex flex-col items-start gap-2.5">
        <HaloDots total={total} index={index} />
        <p className="tabular font-mono text-base text-fg-muted">
          {fill(bg.protectedCheck.progress, { current: index + 1, total })}
        </p>
      </div>
      {/* key: a new question is a new step, so it slides in again. */}
      <div key={id} className="check-step flex flex-col gap-6" data-back={slide.back || undefined}>
        <h1 id="check-question" className="check-question" ref={heading} tabIndex={-1}>
          {QUESTION_TEXT[id]}
        </h1>
        <BigChoice
          question={QUESTION_TEXT[id]}
          hideQuestion
          size="large"
          options={withIcons(optionsFor(id))}
          value={value}
          onChange={(answer) => onAnswer(id, answer)}
          onPick={(answer) => onPick(id, answer)}
        />
      </div>
      {/* Always both buttons, at the bottom. On the first question „Назад“ goes
          back to the big button. */}
      <div className="check-nav flex gap-3">
        <Button variant="secondary" size="xl" className="check-back" onClick={onBack}>
          <ArrowLeft className="size-6 shrink-0" aria-hidden="true" />
          {bg.protectedCheck.back}
        </Button>
        <Button size="xl" className="flex-1" onClick={onNext} disabled={value === null}>
          {bg.protectedCheck.next}
          <ArrowRight className="size-6 shrink-0" aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
