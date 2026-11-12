// Checkbox and Switch: native <input type="checkbox"> underneath, so the keyboard,
// forms and screen readers work by themselves. The whole row (box + words) is the
// tap area, at least 44 px high. The tick and the knob move with a transform.

import { Check } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "./cn";

type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  hint?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

export function Checkbox({ label, hint, className, ...props }: ToggleProps) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-start gap-3 py-2", className)}>
      <span className="relative mt-0.5 inline-flex size-6 shrink-0">
        <input
          type="checkbox"
          className="peer size-6 cursor-pointer appearance-none rounded-sm border border-line-strong bg-surface-1 checked:border-accent checked:bg-accent disabled:cursor-not-allowed disabled:bg-surface-2"
          {...props}
        />
        <Check
          className="pointer-events-none absolute inset-0 m-auto size-4 scale-75 text-on-accent opacity-0 transition-[transform,opacity] duration-150 ease-out peer-checked:scale-100 peer-checked:opacity-100"
          strokeWidth={3}
          aria-hidden="true"
        />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-fg">{label}</span>
        {hint === undefined ? null : <span className="block text-sm text-fg-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function Switch({ label, hint, className, ...props }: ToggleProps) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-start gap-3 py-2", className)}>
      <span className="relative mt-0.5 inline-flex h-7 w-12 shrink-0">
        <input
          type="checkbox"
          role="switch"
          className="peer h-7 w-12 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface-3 checked:border-accent checked:bg-accent disabled:cursor-not-allowed"
          {...props}
        />
        <span className="pointer-events-none absolute top-1 left-1 block size-5 rounded-full bg-fg transition-transform duration-200 ease-out peer-checked:translate-x-5 peer-checked:bg-on-accent" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-fg">{label}</span>
        {hint === undefined ? null : <span className="block text-sm text-fg-muted">{hint}</span>}
      </span>
    </label>
  );
}
