// Dialog: a window over the page, built on the browser's own <dialog> (it traps the
// keyboard focus, closes with Esc and blocks the page behind it). The page behind
// is dimmed and blurred; the window is a raised panel lit from above, entering with
// a short rise and settle (globals.css .dialog).
// Sheet (or variant "sheet"): on a phone it slides up from the bottom edge instead,
// with a small grab bar; on a larger screen it is a normal dialog.
// ConfirmDialog: the ready-made "are you sure?" window before a destructive action.
"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./Button";
import { cn } from "./cn";
import { Notice } from "./Notice";

type DialogProps = {
  open: boolean;
  title: string;
  // Called when the person presses Esc; the parent decides whether to close.
  onClose: () => void;
  variant?: "modal" | "sheet";
  children: ReactNode;
  className?: string;
};

export function Dialog({
  open,
  title,
  onClose,
  variant = "modal",
  children,
  className,
}: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // The `open` prop decides; showModal() and close() are the browser's own calls.
  useEffect(() => {
    const element = dialog.current;
    if (element === null) return;
    if (open && !element.open) {
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  const sheet = variant === "sheet";
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className={cn(
        "dialog surface-raised m-auto w-[min(36rem,calc(100vw-2rem))] rounded-xl bg-elevated p-6 text-fg shadow-overlay md:p-8",
        sheet &&
          "dialog-sheet max-md:mx-0 max-md:mt-auto max-md:mb-0 max-md:w-full max-md:max-w-none max-md:rounded-b-none max-md:pt-4",
        className,
      )}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {sheet ? (
        <span
          aria-hidden="true"
          className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-line-strong md:hidden"
        />
      ) : null}
      <h2 id={titleId} className="mb-3 text-h3">
        {title}
      </h2>
      {children}
    </dialog>
  );
}

// The same window as a bottom sheet on phones.
export function Sheet(props: Omit<DialogProps, "variant">) {
  return <Dialog {...props} variant="sheet" />;
}

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel: string;
  pending: boolean; // true while the request runs: both buttons wait
  error: string | null; // the API's Bulgarian message, if the action failed
  // "danger" (default) for deleting; "primary" for a change that is not destructive.
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  const cancelButton = useRef<HTMLButtonElement>(null);
  const { open } = props;

  // Focus starts on „Отказ“: Enter by accident must not delete anything.
  useEffect(() => {
    if (open) cancelButton.current?.focus();
  }, [open]);

  return (
    <Dialog
      open={open}
      title={props.title}
      onClose={() => {
        if (!props.pending) props.onCancel();
      }}
    >
      <p className="text-fg-muted">{props.text}</p>
      {props.error ? (
        <Notice status="danger" role="alert" className="mt-4">
          {props.error}
        </Notice>
      ) : null}
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          ref={cancelButton}
          variant="secondary"
          disabled={props.pending}
          onClick={props.onCancel}
        >
          {props.cancelLabel}
        </Button>
        <Button
          variant={props.tone === "primary" ? "primary" : "danger"}
          disabled={props.pending}
          disc={false}
          onClick={props.onConfirm}
        >
          {props.pending ? props.pendingLabel : props.confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
