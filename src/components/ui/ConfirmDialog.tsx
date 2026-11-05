// A "are you sure?" window for actions that can't be undone (delete a person,
// remove a phone). Built on the browser's own <dialog> element with showModal():
// the page behind it can't be clicked, Tab stays inside the window, Esc closes it,
// and the browser gives the focus back to the button that opened it.
"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "./Button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel: string;
  pending: boolean; // true while the request runs: both buttons wait
  error: string | null; // the API's Bulgarian message, if the action failed
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const textId = useId();
  const { open } = props;

  // Opens or closes the real <dialog> when `open` changes. The safe choice
  // („Отказ“) gets the focus first, so Enter never deletes anything by accident.
  useEffect(() => {
    const element = dialog.current;
    if (element === null) return;
    if (open && !element.open) {
      element.showModal();
      cancelButton.current?.focus();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={textId}
      // Esc: the browser wants to close the window; we let the parent decide.
      onCancel={(event) => {
        event.preventDefault();
        if (!props.pending) props.onCancel();
      }}
    >
      <h2 id={titleId}>{props.title}</h2>
      <p id={textId}>{props.text}</p>
      {props.error ? (
        <p role="alert" className="form-message form-message-error">
          {props.error}
        </p>
      ) : null}
      <div className="confirm-actions">
        <Button
          ref={cancelButton}
          variant="secondary"
          disabled={props.pending}
          onClick={props.onCancel}
        >
          {props.cancelLabel}
        </Button>
        <Button variant="danger" disabled={props.pending} onClick={props.onConfirm}>
          {props.pending ? props.pendingLabel : props.confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
