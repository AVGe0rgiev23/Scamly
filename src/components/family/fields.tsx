// Small form parts shared by the family forms: a text field, a select field and the
// message line under a form. They are thin wrappers around the design system's
// Field / Input / Select (src/components/ui/Field.tsx): native <input>/<select>
// elements with a real, always visible <label>, so the keyboard, screen readers and
// the phone's own pickers all work.
"use client";

import { useEffect, useRef, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { STATUS_TINT, StatusIcon } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { Field, Input, Select } from "@/components/ui/Field";

// The ids that link a field to its hint and to the form's error message
// (aria-describedby), so a screen reader reads them together with the label.
function describedBy(id: string, hint: string | undefined, errorId: string | undefined) {
  const ids = [hint ? `${id}-hint` : null, errorId ?? null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

type FieldExtras = {
  id: string;
  label: string;
  hint?: string;
  invalid?: boolean; // true = the form's error message is about this field
  errorId?: string; // id of that error message
};

export function TextField({
  id,
  label,
  hint,
  invalid = false,
  errorId,
  mono = false,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> &
  FieldExtras & {
    mono?: boolean; // phone numbers and codes: the data font
  }) {
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint ? hint : undefined}
      hintId={`${id}-hint`}
      className={className}
    >
      <Input
        id={id}
        mono={mono}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy(id, hint, invalid ? errorId : undefined)}
        {...props}
      />
    </Field>
  );
}

export function SelectField({
  id,
  label,
  hint,
  invalid = false,
  errorId,
  children,
  className,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & FieldExtras) {
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint ? hint : undefined}
      hintId={`${id}-hint`}
      className={className}
    >
      <Select
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy(id, hint, invalid ? errorId : undefined)}
        {...props}
      >
        {children}
      </Select>
    </Field>
  );
}

// An error or success message. An error is announced at once (role="alert") and
// gets the keyboard focus, so a keyboard user lands on it after pressing „Запази“.
// It looks like the design system's Notice (tint + icon + words); it is written out
// here because it needs a ref for the focus.
export type FormNotice = { kind: "error" | "success"; text: string } | null;

export function FormMessage({ notice, id }: { notice: FormNotice; id?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (notice?.kind === "error") ref.current?.focus();
  }, [notice]);
  if (notice === null) return null;
  const status = notice.kind === "error" ? "danger" : "safe";
  return (
    <div
      id={id}
      ref={ref}
      tabIndex={-1}
      role={notice.kind === "error" ? "alert" : "status"}
      className={cn(
        "appear flex items-start gap-3 rounded-md border px-4 py-3 text-base",
        STATUS_TINT[status],
      )}
    >
      <StatusIcon status={status} className="mt-[0.2em]" />
      <p className="min-w-0 text-fg">{notice.text}</p>
    </div>
  );
}
