// A big multiple-choice question (yes / no by default, or any list of answers).
// Native radios provide keyboard navigation and an accessible question: the screen
// reader says the question (legend), each answer and which one is chosen.
"use client";

import { useId, useRef } from "react";
import { bg } from "@/i18n/bg";

// One answer: the value we store, the words on screen and an optional picture
// (an emoji, hidden from screen readers). Like a small Python dataclass.
export type ChoiceOption = {
  value: string;
  label: string;
  icon?: string;
};

const YES_NO: ChoiceOption[] = [
  { value: "yes", label: bg.common.yes },
  { value: "no", label: bg.common.no },
];

type BigChoiceProps = {
  question: string;
  value: string | null;
  onChange: (value: string) => void;
  // The answers; Да / Не when left out.
  options?: ChoiceOption[];
  // Called when an answer is TAPPED or clicked (not when the arrow keys move the
  // choice), so a page can go on to the next question after one tap.
  onPick?: (value: string) => void;
  // "large": one answer per row, bigger text (the older person's call check).
  size?: "normal" | "large";
  // true: the question is only read aloud, because the page shows it as a heading.
  hideQuestion?: boolean;
  disabled?: boolean;
  // Id(s) of a hint or error message read together with the question (optional).
  describedBy?: string;
};

export function BigChoice({
  question,
  value,
  onChange,
  options = YES_NO,
  onPick,
  size = "normal",
  hideQuestion = false,
  disabled = false,
  describedBy,
}: BigChoiceProps) {
  // useId gives each instance a unique name, like generating a unique Python dict key.
  const name = useId();
  // true between a finger/mouse press and its click; a key press clears it.
  const pressedByPointer = useRef(false);

  function handleClick(answer: string) {
    if (pressedByPointer.current && onPick) {
      onPick(answer);
    }
    pressedByPointer.current = false;
  }

  return (
    <fieldset
      className={`big-choice big-choice-${size}`}
      disabled={disabled}
      aria-describedby={describedBy}
      onKeyDown={() => {
        pressedByPointer.current = false;
      }}
    >
      <legend className={hideQuestion ? "sr-only" : undefined}>{question}</legend>
      <div className="choice-options">
        {options.map((option) => (
          <label
            className="choice"
            key={option.value}
            onPointerDown={() => {
              pressedByPointer.current = true;
            }}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              onClick={() => handleClick(option.value)}
            />
            {option.icon === undefined ? null : (
              <span className="choice-icon" aria-hidden="true">
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
