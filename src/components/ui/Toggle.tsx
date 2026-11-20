// Checkbox and Switch: native <input type="checkbox"> underneath, so the keyboard,
// forms and screen readers work by themselves. The whole row (box + words) is the
// tap area, at least 44 px high.
//
// Checked, the box and the switch track fill with the halo; the switch thumb slides
// across with a soft overshoot and the tick grows in (transform and opacity only,
// globals.css .toggle-box / .toggle-track / .toggle-thumb).

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
          className="toggle-box peer size-6 cursor-pointer appearance-none rounded-[8px] border border-line-strong disabled:cursor-not-allowed disabled:opacity-55"
          {...props}
        />
        <Check
          className="pointer-events-none absolute inset-0 m-auto size-4 scale-50 opacity-0 transition-[transform,opacity] duration-300 ease-out peer-checked:scale-100 peer-checked:opacity-100"
          strokeWidth={3.25}
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
      <span className="relative mt-0.5 inline-flex h-8 w-14 shrink-0">
        <input
          type="checkbox"
          role="switch"
          className="toggle-track peer h-8 w-14 cursor-pointer appearance-none rounded-full border border-line-strong disabled:cursor-not-allowed disabled:opacity-55"
          {...props}
        />
        <span className="toggle-thumb pointer-events-none absolute top-1 left-1 block size-6 rounded-full" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-fg">{label}</span>
        {hint === undefined ? null : <span className="block text-sm text-fg-muted">{hint}</span>}
      </span>
    </label>
  );
}
