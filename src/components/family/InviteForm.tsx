// „Покани близък“: the owner creates an invite link for another relative
// (POST /api/persons/:id/invites). The relative opens the link, logs in with their
// own account, and from then on sees this person and gets the alerts.
// The token in the link is shown only this once (the server stores only its hash),
// so the page offers a copy button and says when the link stops working.
// Look: one column of fields; the new link appears below in a quiet panel, in the
// data font, with „Копирай връзката“ next to it.
"use client";

import { Copy, Send } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { bg } from "@/i18n/bg";
import { MAX_CONTACTS } from "@/schemas/contacts";
import { CreateInviteSchema } from "@/schemas/invites";
import { callApi } from "./api";
import { FormMessage, SelectField, TextField, type FormNotice } from "./fields";
import { fill, formatDateTime } from "./format";

type InviteResult = { inviteId: string; invitePath: string; expiresAt: string };

export function InviteForm({ personId, contactCount }: { personId: string; contactCount: number }) {
  const [invite, setInvite] = useState<{ link: string; expiresAt: string } | null>(null);
  const [notice, setNotice] = useState<FormNotice>(null);
  const [copyNotice, setCopyNotice] = useState<FormNotice>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const errorId = useId();
  const linkId = useId();
  // The first free place after the current list (the API also moves the new relative
  // down to the next free place if this one is taken when the link is opened).
  const defaultPlace = Math.min(contactCount + 1, MAX_CONTACTS);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = new FormData(event.currentTarget);
    const input = CreateInviteSchema.safeParse({
      displayName: String(values.get("displayName") ?? ""),
      priority: Number(values.get("priority")),
    });
    if (!input.success) {
      const issue = input.error.issues[0];
      setInvalidField(typeof issue?.path[0] === "string" ? issue.path[0] : null);
      setNotice({ kind: "error", text: issue?.message ?? bg.errors.validation });
      return;
    }
    setPending(true);
    setNotice(null);
    setCopyNotice(null);
    setInvalidField(null);
    const result = await callApi<InviteResult>(
      `/api/persons/${personId}/invites`,
      "POST",
      input.data,
    );
    setPending(false);
    if (!result.ok) {
      setNotice({ kind: "error", text: result.messageBg });
      return;
    }
    // The API gives the path (/pokana?t=…); the full link adds our own address.
    setInvite({
      link: `${window.location.origin}${result.data.invitePath}`,
      expiresAt: result.data.expiresAt,
    });
    setNotice({ kind: "success", text: bg.family.inviteCreated });
  }

  async function copy() {
    if (invite === null) return;
    try {
      await navigator.clipboard.writeText(invite.link);
      setCopyNotice({ kind: "success", text: bg.family.copied });
    } catch {
      // No clipboard access (old browser, or not allowed): the person copies by hand.
      setCopyNotice({ kind: "error", text: bg.family.copyFailed });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[60ch] text-fg-muted">{bg.family.inviteIntro}</p>
      <form
        noValidate
        onSubmit={submit}
        aria-busy={pending}
        className="flex max-w-lg flex-col gap-4"
      >
        <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5">
          <TextField
            id="invite-name"
            name="displayName"
            label={bg.family.inviteName}
            maxLength={60}
            autoComplete="off"
            invalid={invalidField === "displayName"}
            errorId={errorId}
          />
          <SelectField
            id="invite-place"
            name="priority"
            label={bg.family.invitePlace}
            defaultValue={String(defaultPlace)}
            invalid={invalidField === "priority"}
            errorId={errorId}
          >
            {[1, 2, 3, 4, 5].map((place) => (
              <option key={place} value={place}>
                {fill(bg.family.contactPlace, { n: place })}
              </option>
            ))}
          </SelectField>
          <div>
            <Button type="submit" variant="secondary" loading={pending}>
              {pending ? null : <Send className="size-5" aria-hidden="true" />}
              {pending ? bg.family.saving : bg.family.inviteButton}
            </Button>
          </div>
        </fieldset>
        <FormMessage notice={notice} id={errorId} />
      </form>

      {invite ? (
        <div className="appear flex flex-col gap-3 rounded-lg border border-line bg-surface-1 p-5">
          <Field label={bg.family.inviteLinkLabel} htmlFor={linkId}>
            <Input
              id={linkId}
              type="text"
              readOnly
              mono
              value={invite.link}
              onFocus={(event) => event.target.select()}
            />
          </Field>
          <p className="text-sm text-fg-muted">
            {fill(bg.family.inviteExpires, { time: formatDateTime(invite.expiresAt) })}
          </p>
          <p className="text-sm text-fg-muted">{bg.family.inviteOnce}</p>
          <div>
            <Button variant="secondary" onClick={copy}>
              <Copy className="size-5" aria-hidden="true" />
              {bg.family.copyLink}
            </Button>
          </div>
          <FormMessage notice={copyNotice} />
        </div>
      ) : null}
    </div>
  );
}
