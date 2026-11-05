// Small form parts shared by the family forms: a text field, a select field and the
// message line under a form. Native <input>/<select> elements with a real <label>,
// so the keyboard, screen readers and the phone's own pickers all work.
"use client";

import { useEffect, useRef, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";

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
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldExtras) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy(id, hint, invalid ? errorId : undefined)}
        {...props}
      />
      {hint ? (
        <p id={`${id}-hint`} className="muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField({
  id,
  label,
  hint,
  invalid = false,
  errorId,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & FieldExtras) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy(id, hint, invalid ? errorId : undefined)}
        {...props}
      >
        {children}
      </select>
      {hint ? (
        <p id={`${id}-hint`} className="muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// An error or success message. An error is announced at once (role="alert") and
// gets the keyboard focus, so a keyboard user lands on it after pressing „Запази“.
export type FormNotice = { kind: "error" | "success"; text: string } | null;

export function FormMessage({ notice, id }: { notice: FormNotice; id?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (notice?.kind === "error") ref.current?.focus();
  }, [notice]);
  if (notice === null) return null;
  return (
    <p
      id={id}
      ref={ref}
      tabIndex={-1}
      role={notice.kind === "error" ? "alert" : "status"}
      className={`form-message form-message-${notice.kind}`}
    >
      {notice.text}
    </p>
  );
}
