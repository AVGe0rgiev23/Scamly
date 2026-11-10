// The „Отхвърли“ window of the report queue (W3-04 UI): a required reason (3–200
// characters) with a counter, and quick-pick buttons that fill in a common reason.
// Built on the browser's own <dialog> with showModal(), like ConfirmDialog: the page
// behind it can't be clicked, Tab stays inside the window, Esc closes it, and the
// browser gives the focus back to the „Отхвърли“ button that opened it.
"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { fill } from "@/components/family/format";
import { Button } from "@/components/ui/Button";
import { bg } from "@/i18n/bg";
import { MAX_REJECT_REASON } from "@/schemas/moderation";
import { rejectReasonError } from "./reportQueue";

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
      className="confirm-dialog mod-reject"
      aria-labelledby={ids.title}
      aria-describedby={ids.text}
      // Esc: the browser wants to close the window; we let the parent decide.
      onCancel={(event) => {
        event.preventDefault();
        if (!props.pending) props.onCancel();
      }}
    >
      <h2 id={ids.title}>{bg.moderator.rejectTitle}</h2>
      <p id={ids.text}>
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
    <form className="mod-reject-form" noValidate onSubmit={onSubmit}>
      <div className="form-field">
        <label htmlFor={ids.field}>{bg.moderator.rejectReasonLabel}</label>
        <textarea
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
        <p id={ids.count} className="muted mod-counter">
          {fill(bg.moderator.charCount, { count: reason.length, max: MAX_REJECT_REASON })}
        </p>
        {fieldError ? (
          <p id={ids.error} role="alert" className="form-message form-message-error">
            {fieldError}
          </p>
        ) : null}
      </div>
      <fieldset className="mod-quick">
        <legend>{bg.moderator.quickReasonsLabel}</legend>
        <div className="mod-quick-list">
          {bg.moderator.quickReasons.map((quick) => (
            <button
              key={quick}
              type="button"
              className="mod-quick-reason"
              aria-pressed={reason.trim() === quick}
              disabled={props.pending}
              onClick={() => {
                setReason(quick);
                setFieldError(null);
                field.current?.focus();
              }}
            >
              {quick}
            </button>
          ))}
        </div>
      </fieldset>
      {props.error ? (
        <p role="alert" className="form-message form-message-error">
          {props.error}
        </p>
      ) : null}
      <div className="confirm-actions">
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
