// A multiple-choice question as huge, tactile tiles (yes / no by default, or any
// list of answers): an icon disc and a word on a raised surface. Native radios
// underneath give keyboard navigation and an accessible question: the screen reader
// says the question (legend), each answer and which one is chosen.
//
// The chosen tile gets the halo ring (a gradient border, globals.css .choice-tile)
// AND a filled check mark, never colour alone. Pressing a tile shrinks it a little
// (scale 0.97), so a finger feels the press.
"use client";

import { Check } from "lucide-react";
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
  // "large": one answer per row, at least 96 px high, bigger text (the older
  // person's call check).
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
      <legend
        className={hideQuestion ? "sr-only" : "mb-4 font-display text-xl font-semibold text-fg"}
      >
        {question}
      </legend>
      <div
        className={cn(
          "grid gap-3",
          large ? "grid-cols-1 gap-4" : "grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]",
        )}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "choice-tile relative flex cursor-pointer items-center gap-4 rounded-lg font-semibold text-fg",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-ring",
              "has-disabled:cursor-not-allowed has-disabled:opacity-55",
              large ? "min-h-24 px-5 py-4 text-2xl md:px-7" : "min-h-20 px-5 py-3 text-lg",
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
              // Invisible but covering the whole tile, so a tap anywhere hits the
              // real radio (and tests and assistive tools can click it).
              className="peer absolute inset-0 size-full cursor-pointer appearance-none rounded-lg opacity-0"
            />
            {option.icon === undefined ? null : (
              <span
                aria-hidden="true"
                className={cn(
                  "inline-grid shrink-0 place-items-center rounded-full bg-glass-2 text-fg shadow-highlight peer-checked:text-fg",
                  large ? "size-14 [&>svg]:size-7" : "size-11 [&>svg]:size-6",
                )}
              >
                {option.icon}
              </span>
            )}
            <span className="min-w-0 flex-1">{option.label}</span>
            {/* Our own radio mark: an empty ring, filled with the halo and a check when chosen. */}
            <span
              aria-hidden="true"
              className={cn(
                "inline-grid shrink-0 place-items-center rounded-full border-2 border-line-strong text-on-primary",
                "peer-checked:border-transparent peer-checked:bg-primary peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:opacity-100",
                large ? "size-9" : "size-7",
              )}
            >
              <Check
                strokeWidth={3}
                className="size-[60%] scale-50 opacity-0 transition-[transform,opacity] duration-300 ease-out"
              />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
