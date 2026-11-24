// Confirm an irreversible account deletion and leave the signed-out family area.
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Notice } from "@/components/ui/Notice";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

export function AccountDeletion() {
  const copy = bg.accountData;
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (pending) return;
    setOpen(false);
    setConfirm("");
    setError(null);
  }

  async function removeAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || confirm !== copy.confirmWord) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      if (!response.ok) {
        const body = await response.json();
        setError(body.error?.messageBg ?? bg.errors.internal);
        return;
      }
      window.location.replace(ROUTES.home);
    } catch {
      setError(bg.errors.internal);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="surface-raised space-y-3 rounded-xl p-6">
      <h2 className="text-h3">{copy.deleteTitle}</h2>
      <p className="text-fg-muted">{copy.deleteIntro}</p>
      <Button variant="danger" onClick={() => setOpen(true)}>
        {copy.deleteButton}
      </Button>
      <Dialog open={open} title={copy.deleteTitle} onClose={close}>
        <form onSubmit={removeAccount} className="space-y-4">
          <p className="text-fg-muted">{copy.deleteIntro}</p>
          <label className="block space-y-2">
            <span>{copy.confirmHint}</span>
            <input
              autoComplete="off"
              disabled={pending}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="block min-h-12 w-full rounded-md border border-line-strong bg-elevated px-3"
            />
          </label>
          {error && (
            <Notice role="alert" status="danger">
              {error}
            </Notice>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" disabled={pending} onClick={close}>
              {copy.cancel}
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={pending || confirm !== copy.confirmWord}
            >
              {pending ? copy.deleting : copy.deleteButton}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
