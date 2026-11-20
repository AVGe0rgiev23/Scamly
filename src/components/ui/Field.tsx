// Form fields: Field (label + hint + error around any control), Input, Textarea and
// Select. The label is always visible (no placeholder-only fields), the error is
// linked to the control with aria-describedby, and every control is at least 48 px
// high. `size="lg"` is for the older person's screens (64 px, 22 px text).
//
// The control is a slightly sunken glass well (a soft inner shadow at the top);
// on focus its border turns to the halo colour and a soft glow appears around it
// (globals.css .field-control).

import { ChevronDown } from "lucide-react";
import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "./cn";

export const CONTROL =
  "field-control block w-full rounded-md border border-line-strong px-4 text-fg " +
  "placeholder:text-fg-subtle hover:border-fg-subtle " +
  "aria-invalid:border-danger-solid disabled:cursor-not-allowed disabled:opacity-55";

const CONTROL_SIZE = { md: "min-h-12 text-base", lg: "min-h-16 text-xl" };

type FieldProps = {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  hintId?: string;
  error?: ReactNode;
  errorId?: string;
  className?: string;
  children: ReactNode;
};

export function Field({
  label,
  htmlFor,
  hint,
  hintId,
  error,
  errorId,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="font-semibold text-fg">
        {label}
      </label>
      {children}
      {hint === undefined || hint === null ? null : (
        <p id={hintId} className="text-sm text-fg-muted">
          {hint}
        </p>
      )}
      {error === undefined || error === null || error === "" ? null : (
        <p id={errorId} role="alert" className="text-sm font-semibold text-danger-fg">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: "md" | "lg";
  mono?: boolean; // codes and phone numbers
  ref?: Ref<HTMLInputElement>;
};

export function Input({ size = "md", mono = false, className, ...props }: InputProps) {
  return (
    <input
      className={cn(CONTROL, CONTROL_SIZE[size], mono && "tabular font-mono", className)}
      {...props}
    />
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  size?: "md" | "lg";
  ref?: Ref<HTMLTextAreaElement>;
};

export function Textarea({ size = "md", className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(CONTROL, CONTROL_SIZE[size], "py-3 leading-normal", className)}
      {...props}
    />
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  size?: "md" | "lg";
  ref?: Ref<HTMLSelectElement>;
};

// A native <select> (the phone shows its own big picker), with our own chevron in
// a small disc.
export function Select({ size = "md", className, children, ...props }: SelectProps) {
  return (
    <span className="relative block">
      <select
        className={cn(
          CONTROL,
          CONTROL_SIZE[size],
          "cursor-pointer appearance-none pr-14",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 inline-grid size-8 -translate-y-1/2 place-items-center rounded-full bg-glass-2 text-fg-muted shadow-highlight"
      >
        <ChevronDown className="size-4" />
      </span>
    </span>
  );
}
