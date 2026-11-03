// Native radios provide keyboard navigation and an accessible yes/no question.
"use client";

import { useId } from "react";
import { bg } from "@/i18n/bg";

type BigChoiceProps = {
  question: string;
  value: "yes" | "no" | null;
  onChange: (value: "yes" | "no") => void;
  disabled?: boolean;
};

export function BigChoice({ question, value, onChange, disabled = false }: BigChoiceProps) {
  // useId gives each instance a unique name, like generating a unique Python dict key.
  const name = useId();
  return (
    <fieldset className="big-choice" disabled={disabled}>
      <legend>{question}</legend>
      <div className="choice-options">
        {(["yes", "no"] as const).map((answer) => (
          <label className="choice" key={answer}>
            <input
              type="radio"
              name={name}
              value={answer}
              checked={value === answer}
              onChange={() => onChange(answer)}
            />
            <span>{bg.common[answer]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
