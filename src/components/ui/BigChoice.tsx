// A multiple-choice question as large tiles (yes / no by default, or any list of
// answers). Native radios underneath give keyboard navigation and an accessible
// question: the screen reader says the question (legend), each answer and which one
// is chosen. The chosen tile gets the accent frame AND a filled dot, never colour
// alone.
"use client";

import { useId, useRef, type ReactNode } from "react";
import { bg } from "@/i18n/bg";
import { cn } from "./cn";

// One answer: the value we store, the words on screen and an optional small drawing
// (an icon component, hidden from screen readers). Like a small Python dataclass.
export type ChoiceOption = {
  value: string;
  label: string;
  icon?: ReactNode;
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

  const large = size === "large";
  return (
    <fieldset
      className="min-w-0 border-0 p-0"
      disabled={disabled}
      aria-describedby={describedBy}
      onKeyDown={() => {
        pressedByPointer.current = false;
      }}
    >
      <legend className={hideQuestion ? "sr-only" : "mb-3 font-semibold text-fg"}>{question}</legend>
      <div className={cn("grid gap-3", large ? "grid-cols-1" : "grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]")}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "pressable relative flex cursor-pointer items-center gap-4 rounded-md border border-line-strong bg-surface-1 font-semibold text-fg",
              "hover:bg-surface-2 has-checked:border-accent has-checked:bg-accent-bg has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-ring has-disabled:cursor-not-allowed has-disabled:text-fg-subtle",
              large ? "min-h-[4.5rem] px-5 py-3 text-xl" : "min-h-14 px-4 py-2 text-base",
            )}
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
              className="peer sr-only"
            />
            {/* Our own radio mark: a ring, with a dot when chosen. */}
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-line-strong peer-checked:border-accent peer-checked:[&>span]:scale-100"
            >
              <span className="block size-3 scale-0 rounded-full bg-accent transition-transform duration-150 ease-out" />
            </span>
            {option.icon === undefined ? null : (
              <span aria-hidden="true" className="shrink-0 text-fg-muted [&>svg]:size-[1.4em]">
                {option.icon}
              </span>
            )}
            <span className="min-w-0">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
