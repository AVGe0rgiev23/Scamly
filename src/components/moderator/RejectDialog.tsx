// The „Отхвърли“ window of the report queue (W3-04 UI): a required reason (3–200
// characters) with a counter, and quick-pick chips that fill in a common reason.
// Built on the browser's own <dialog> with showModal(), like ui/Dialog: the page
// behind it can't be clicked, Tab stays inside the window, Esc closes it, and the
// browser gives the focus back to the „Отхвърли“ button that opened it.
// It looks like ui/Dialog with variant="sheet" (on a phone it slides up from the bottom
// edge); it keeps its own <dialog> element because it also needs aria-describedby.
"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { fill } from "@/components/family/format";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { bg } from "@/i18n/bg";
import { MAX_REJECT_REASON } from "@/schemas/moderation";
import { rejectReasonError } from "./reportQueueHelpers";

type RejectDialogProps = {
  open: boolean;
  context: string; // which report, for screen readers („сигнал „Полицай“ от област …“)
  pending: boolean; // true while the request runs
  error: string | null; // the API's Bulgarian message, if the request failed
  onSubmit: (reason: string) => void;
  onCancel: () => void;
};

export function RejectDialog(props: RejectDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const ids = { title: useId(), text: useId() };
  const { open } = props;

  // Opens or closes the real <dialog> when `open` changes. showModal() puts the focus
  // on the first field inside: the reason.
  useEffect(() => {
    const element = dialog.current;
    if (element === null) return;
    if (open && !element.open) {
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      // The same classes as ui/Dialog with variant="sheet".
      className="dialog dialog-sheet m-auto w-[min(34rem,calc(100vw-2rem))] rounded-lg border border-line-strong bg-surface-1 p-6 text-fg shadow-overlay max-md:mx-0 max-md:mt-auto max-md:mb-0 max-md:w-full max-md:max-w-none max-md:rounded-b-none md:p-8"
      aria-labelledby={ids.title}
      aria-describedby={ids.text}
      // Esc: the browser wants to close the window; we let the parent decide.
      onCancel={(event) => {
        event.preventDefault();
        if (!props.pending) props.onCancel();
      }}
    >
      <h2 id={ids.title} className="mb-3 text-h3">
        {bg.moderator.rejectTitle}
      </h2>
      <p id={ids.text} className="text-fg-muted">
        {bg.moderator.rejectText} <span className="sr-only">({props.context})</span>
      </p>
      {/* Mounted only while open, so every opening starts with an empty field. */}
      {open ? <RejectForm {...props} /> : null}
    </dialog>
  );
}

// The form inside the window: the reason, its counter, the quick picks and the buttons.
function RejectForm(props: RejectDialogProps) {
  const field = useRef<HTMLTextAreaElement>(null);
  const ids = { field: useId(), count: useId(), error: useId() };
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = rejectReasonError(reason);
    setFieldError(error);
    if (error !== null) {
      field.current?.focus();
      return;
    }
    props.onSubmit(reason.trim());
  }

  const describedBy = [ids.count, fieldError ? ids.error : null].filter(Boolean).join(" ");

  return (
    <form className="mt-5 flex flex-col gap-5" noValidate onSubmit={onSubmit}>
      <Field
        label={bg.moderator.rejectReasonLabel}
        htmlFor={ids.field}
        error={fieldError}
        errorId={ids.error}
      >
        <Textarea
          ref={field}
          id={ids.field}
          rows={3}
          required
          maxLength={MAX_REJECT_REASON}
          value={reason}
          aria-invalid={fieldError !== null || undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            setReason(event.target.value);
            if (fieldError !== null) setFieldError(null);
          }}
        />
        <p id={ids.count} className="tabular text-right font-mono text-xs text-fg-subtle">
          {fill(bg.moderator.charCount, { count: reason.length, max: MAX_REJECT_REASON })}
        </p>
      </Field>
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-semibold text-fg-muted">
          {bg.moderator.quickReasonsLabel}
        </legend>
        <div className="flex flex-wrap gap-2">
          {bg.moderator.quickReasons.map((quick) => (
            <Button
              key={quick}
              variant="secondary"
              size="sm"
              className="rounded-sm! font-medium aria-pressed:border-accent-line aria-pressed:bg-accent-bg"
              aria-pressed={reason.trim() === quick}
              disabled={props.pending}
              onClick={() => {
                setReason(quick);
                setFieldError(null);
                field.current?.focus();
              }}
            >
              {quick}
            </Button>
          ))}
        </div>
      </fieldset>
      {props.error ? (
        <Notice status="danger" role="alert">
          {props.error}
        </Notice>
      ) : null}
      <div className="mt-1 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" disabled={props.pending} onClick={props.onCancel}>
          {bg.moderator.cancel}
        </Button>
        <Button type="submit" variant="danger" disabled={props.pending}>
          {props.pending ? bg.moderator.rejecting : bg.moderator.rejectConfirm}
        </Button>
      </div>
    </form>
  );
}
