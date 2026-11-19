// Segmented: a small row of choices in one pill, with a raised thumb that slides
// under the chosen one (like a physical slider switch). Native radio buttons
// underneath, so the arrow keys move between the choices and a screen reader says
// "1 of 3, selected".
//
// The thumb is one element moved with a CSS transform: every segment has the same
// width, so "segment number i" is simply translateX(i × 100 %) of the thumb.
"use client";

import { useId, type ReactNode } from "react";
import { cn } from "./cn";

// One choice, like a small Python dataclass. `icon` + hideLabel: an icon-only
// segment whose words are read aloud and shown as a native hover title.
export type SegmentOption<Value extends string> = {
  value: Value;
  label: string;
  icon?: ReactNode;
  hideLabel?: boolean;
};

type SegmentedProps<Value extends string> = {
  // The name of the whole group, read aloud (e.g. „Изглед“).
  label: string;
  // true: the group name is only read aloud, not shown.
  hideGroupLabel?: boolean;
  options: SegmentOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  size?: "sm" | "md";
  className?: string;
};

export function Segmented<Value extends string>({
  label,
  hideGroupLabel = true,
  options,
  value,
  onChange,
  size = "md",
  className,
}: SegmentedProps<Value>) {
  const name = useId();
  const labelId = useId();
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  return (
    <div className={cn("flex shrink-0 items-center gap-3", className)}>
      <span id={labelId} className={hideGroupLabel ? "sr-only" : "text-sm font-semibold text-fg"}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="glass relative grid grid-flow-col auto-cols-fr rounded-full p-1"
      >
        {/* The thumb: as wide as one segment, moved to the chosen one. */}
        <span
          aria-hidden="true"
          className="segmented-thumb pointer-events-none absolute inset-y-1 left-1 rounded-full"
          style={{
            width: `calc((100% - 0.5rem) / ${options.length})`,
            transform: `translateX(${index * 100}%)`,
          }}
        />
        {options.map((option) => (
          <label
            key={option.value}
            title={option.hideLabel ? option.label : undefined}
            className={cn(
              "relative z-10 flex cursor-pointer items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap",
              "text-fg-muted transition-colors duration-150 hover:text-fg has-checked:text-fg",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
              size === "sm" ? "min-h-9 px-3 text-sm" : "min-h-11 px-3.5 text-sm",
              option.hideLabel && (size === "sm" ? "min-w-9 px-0" : "min-w-11 px-0"),
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="absolute inset-0 size-full cursor-pointer appearance-none rounded-full opacity-0"
            />
            {option.icon === undefined ? null : (
              <span aria-hidden="true" className="[&>svg]:size-[1.15rem]">
                {option.icon}
              </span>
            )}
            <span className={option.hideLabel ? "sr-only" : undefined}>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
