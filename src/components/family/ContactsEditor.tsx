// „Ред за обаждане“: the ordered list of trusted contacts (places 1 to 5).
//
// The owner edits a DRAFT copy of the list in the browser: change names and phones,
// move people with ↑ / ↓, remove someone, add a relative with a phone. Nothing is
// sent until „Запази списъка“: then the whole new list goes to the API in one
// request (PUT /api/persons/:id/contacts), which saves it in one database
// transaction. Everyone else sees the same list read-only.
//
// Why ↑ / ↓ buttons and not drag and drop: buttons work with a keyboard, a screen
// reader and a shaky finger, and need no extra library (docs/WHY_WE_CHOSE.md).
//
// Look: hairline-separated rows (`.contact-list > li`), each with its place as a big
// number in the data font, the name, the phone in the data font, ↑ / ↓ icon buttons
// with a tooltip, and „Премахни“ as a quiet ghost button.
"use client";

import { ArrowDown, ArrowUp, Phone, UserPlus } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { bg } from "@/i18n/bg";
import { ContactInputSchema, ContactsSchema, MAX_CONTACTS } from "@/schemas/contacts";
import { callApi, type ContactDto } from "./api";
import { FormMessage, TextField, type FormNotice } from "./fields";
import { fill } from "./format";

// One row of the draft. `key` stays the same while the row moves, so React keeps
// the row's inputs (and the keyboard focus) with the right person.
type DraftContact = {
  key: string;
  id: string | null; // null = new, not saved yet
  displayName: string;
  phone: string;
  hasAccount: boolean;
  isOwner: boolean;
};

// What PUT /api/persons/:id/contacts expects for one contact.
type ContactPayload = {
  id?: string;
  displayName: string;
  phone: string | null;
  priority: number;
};

function toDraft(contacts: ContactDto[]): DraftContact[] {
  return [...contacts]
    .sort((a, b) => a.priority - b.priority)
    .map((contact) => ({
      key: contact.id,
      id: contact.id,
      displayName: contact.displayName,
      phone: contact.phone ?? "",
      hasAccount: contact.hasAccount,
      isOwner: contact.isOwner,
    }));
}

// The request body: the rows in their new order. Place = position in the list.
function toPayload(draft: DraftContact[]): ContactPayload[] {
  return draft.map((row, index) => {
    const phone = row.phone.trim() === "" ? null : row.phone.trim();
    const item: ContactPayload = {
      displayName: row.displayName.trim(),
      phone,
      priority: index + 1,
    };
    if (row.id !== null) {
      item.id = row.id;
    }
    return item;
  });
}

// A short text that tells whether the draft differs from the saved list.
function fingerprint(draft: DraftContact[]): string {
  return JSON.stringify(toPayload(draft));
}

// The name used in button labels, also for a row whose name was just erased.
function nameOf(row: DraftContact): string {
  return row.displayName.trim() === "" ? bg.family.unnamed : row.displayName.trim();
}

type ContactsEditorProps = {
  personId: string;
  contacts: ContactDto[];
  canEdit: boolean;
  onSaved: (contacts: ContactDto[]) => void;
};

export function ContactsEditor({ personId, contacts, canEdit, onSaved }: ContactsEditorProps) {
  if (!canEdit) {
    return <ContactsReadOnly contacts={contacts} />;
  }
  return <ContactsForm personId={personId} contacts={contacts} onSaved={onSaved} />;
}

// The place number at the start of a row (the words „Място N“ are for screen readers).
const PLACE_NUMBER =
  "tabular w-8 shrink-0 pt-1 font-mono text-xl font-semibold leading-none text-fg-subtle";
const ROW = "flex gap-3 border-b border-line py-5 sm:gap-4";

function ContactsReadOnly({ contacts }: { contacts: ContactDto[] }) {
  const sorted = [...contacts].sort((a, b) => a.priority - b.priority);
  return (
    <>
      <p className="max-w-[60ch] text-fg-muted">{bg.family.contactsIntro}</p>
      <ol className="contact-list mt-4 border-t border-line">
        {sorted.map((contact) => (
          <li key={contact.id} className={ROW}>
            <span className={PLACE_NUMBER} aria-hidden="true">
              {contact.priority}
            </span>
            <div className="min-w-0 flex-1">
              <p className="sr-only">{fill(bg.family.contactPlace, { n: contact.priority })}</p>
              <p className="font-semibold text-fg">{contact.displayName}</p>
              <p className="mt-1">
                {contact.phone ? (
                  <a
                    href={`tel:${contact.phone}`}
                    className="tabular inline-flex min-h-11 items-center gap-2 font-mono text-accent underline underline-offset-4"
                  >
                    <Phone className="size-5" aria-hidden="true" />
                    {contact.phone}
                  </a>
                ) : (
                  <span className="text-fg-muted">{bg.family.noPhone}</span>
                )}
              </p>
              <p className="text-sm text-fg-muted">
                {contact.hasAccount ? bg.family.hasAccount : bg.family.noAccount}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

function ContactsForm({
  personId,
  contacts,
  onSaved,
}: {
  personId: string;
  contacts: ContactDto[];
  onSaved: (contacts: ContactDto[]) => void;
}) {
  const [draft, setDraft] = useState<DraftContact[]>(() => toDraft(contacts));
  const [savedFingerprint, setSavedFingerprint] = useState(() => fingerprint(toDraft(contacts)));
  const [notice, setNotice] = useState<FormNotice>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [pending, setPending] = useState(false);
  // After ↑ / ↓: the id of the button that should get the focus back (the row moved
  // in the page). A ref, because changing it must not draw the page again.
  const focusAfterMove = useRef<string | null>(null);
  const newKeys = useRef(0);
  const errorId = useId();

  useEffect(() => {
    if (focusAfterMove.current === null) return;
    document.getElementById(focusAfterMove.current)?.focus();
    focusAfterMove.current = null;
  }, [draft]);

  const dirty = fingerprint(draft) !== savedFingerprint;

  function change(index: number, field: "displayName" | "phone", value: string) {
    setDraft(draft.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  // Swaps a row with its neighbour above (-1) or below (+1).
  function move(index: number, step: -1 | 1) {
    const target = index + step;
    const row = draft[index];
    const other = draft[target];
    if (row === undefined || other === undefined) return;
    const next = [...draft];
    next[index] = other;
    next[target] = row;
    setDraft(next);
    setAnnouncement(fill(bg.family.movedTo, { name: nameOf(row), n: target + 1 }));
    // Keep the focus on the same arrow; at the top or bottom that arrow is disabled,
    // so the other arrow of the same row gets it.
    const atEdge = (step === -1 && target === 0) || (step === 1 && target === next.length - 1);
    const direction = (step === -1) !== atEdge ? "up" : "down";
    focusAfterMove.current = `${row.key}-${direction}`;
  }

  function remove(index: number) {
    setDraft(draft.filter((_, i) => i !== index));
  }

  function add(row: { displayName: string; phone: string }) {
    newKeys.current += 1;
    setDraft([
      ...draft,
      {
        key: `new-${newKeys.current}`,
        id: null,
        displayName: row.displayName,
        phone: row.phone,
        hasAccount: false,
        isOwner: false,
      },
    ]);
    setNotice(null);
  }

  async function save() {
    if (pending) return;
    const payload = toPayload(draft);
    // 1. The same rules as the API (schema), so the message comes at once.
    const checked = ContactsSchema.safeParse(payload);
    if (!checked.success) {
      const issue = checked.error.issues[0];
      const rowIndex = typeof issue?.path[0] === "number" ? issue.path[0] : null;
      const field = issue?.path[1];
      const row = rowIndex === null ? undefined : draft[rowIndex];
      setInvalidField(row && typeof field === "string" ? `${row.key}-${field}` : null);
      setNotice({ kind: "error", text: issue?.message ?? bg.errors.validation });
      return;
    }
    // 2. A relative without an account can only be reached by phone.
    const missingPhone = draft.find((row) => !row.hasAccount && row.phone.trim() === "");
    if (missingPhone !== undefined) {
      setInvalidField(`${missingPhone.key}-phone`);
      setNotice({ kind: "error", text: bg.contacts.phoneRequired });
      return;
    }

    setPending(true);
    setNotice(null);
    setInvalidField(null);
    const result = await callApi<{ contacts: ContactDto[] }>(
      `/api/persons/${personId}/contacts`,
      "PUT",
      payload,
    );
    setPending(false);
    if (!result.ok) {
      setNotice({ kind: "error", text: result.messageBg });
      return;
    }
    const saved = toDraft(result.data.contacts);
    setDraft(saved);
    setSavedFingerprint(fingerprint(saved));
    setNotice({ kind: "success", text: bg.family.contactsSaved });
    onSaved(result.data.contacts);
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <p className="max-w-[60ch] text-fg-muted">{bg.family.contactsIntro}</p>
      <ol className="contact-list w-full border-t border-line">
        {draft.map((row, index) => (
          <li key={row.key} className={ROW}>
            <span className={PLACE_NUMBER} aria-hidden="true">
              {index + 1}
            </span>
            <fieldset disabled={pending} className="min-w-0 flex-1">
              <legend className="sr-only">{fill(bg.family.contactPlace, { n: index + 1 })}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id={`${row.key}-displayName`}
                  label={bg.family.contactName}
                  value={row.displayName}
                  onChange={(event) => change(index, "displayName", event.target.value)}
                  maxLength={60}
                  autoComplete="off"
                  invalid={invalidField === `${row.key}-displayName`}
                  errorId={errorId}
                />
                <TextField
                  id={`${row.key}-phone`}
                  label={bg.family.contactPhone}
                  value={row.phone}
                  onChange={(event) => change(index, "phone", event.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  maxLength={30}
                  placeholder={bg.family.phoneHint}
                  mono
                  invalid={invalidField === `${row.key}-phone`}
                  errorId={errorId}
                />
              </div>
              <p className="mt-2 text-sm text-fg-muted">
                {row.isOwner ? `${bg.family.you}. ` : ""}
                {row.hasAccount ? bg.family.hasAccount : bg.family.noAccount}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Tooltip text={bg.family.moveUpHint}>
                  <Button
                    id={`${row.key}-up`}
                    variant="secondary"
                    size="icon"
                    aria-label={fill(bg.family.moveUp, { name: nameOf(row) })}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp className="size-5" aria-hidden="true" />
                  </Button>
                </Tooltip>
                <Tooltip text={bg.family.moveDownHint}>
                  <Button
                    id={`${row.key}-down`}
                    variant="secondary"
                    size="icon"
                    aria-label={fill(bg.family.moveDown, { name: nameOf(row) })}
                    disabled={index === draft.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown className="size-5" aria-hidden="true" />
                  </Button>
                </Tooltip>
                {row.isOwner ? null : (
                  <Button
                    variant="ghost"
                    className="contact-remove ml-auto"
                    aria-label={fill(bg.family.removeContactLabel, { name: nameOf(row) })}
                    onClick={() => remove(index)}
                  >
                    {bg.family.removeContact}
                  </Button>
                )}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      {/* Read aloud after ↑ / ↓ („Иван е на място 2.“); invisible on screen. */}
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {draft.length < MAX_CONTACTS ? (
        <AddContactForm onAdd={add} nextPlace={draft.length + 1} disabled={pending} />
      ) : (
        <p className="text-fg-muted">{bg.family.listFull}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={!dirty} loading={pending}>
          {pending ? bg.family.saving : bg.family.saveContacts}
        </Button>
        {dirty ? <Badge status="caution">{bg.family.unsavedChanges}</Badge> : null}
      </div>
      <div className="w-full empty:hidden">
        <FormMessage notice={notice} id={errorId} />
      </div>
    </div>
  );
}

// „Добавяне на близък с телефон“: adds a row to the draft (not saved yet).
// A contact added here never has an account, so the phone number is required.
function AddContactForm({
  onAdd,
  nextPlace,
  disabled,
}: {
  onAdd: (row: { displayName: string; phone: string }) => void;
  nextPlace: number;
  disabled: boolean;
}) {
  const [notice, setNotice] = useState<FormNotice>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const errorId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const displayName = String(values.get("displayName") ?? "");
    const phone = String(values.get("phone") ?? "");
    const checked = ContactInputSchema.safeParse({ displayName, phone, priority: nextPlace });
    if (!checked.success) {
      const issue = checked.error.issues[0];
      setInvalidField(typeof issue?.path[0] === "string" ? issue.path[0] : null);
      setNotice({ kind: "error", text: issue?.message ?? bg.errors.validation });
      return;
    }
    if (phone.trim() === "") {
      setInvalidField("phone");
      setNotice({ kind: "error", text: bg.contacts.phoneRequired });
      return;
    }
    setNotice(null);
    setInvalidField(null);
    onAdd({ displayName: displayName.trim(), phone: phone.trim() });
    form.reset();
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="contact-add flex w-full flex-col gap-4 rounded-lg border border-line bg-surface-1 p-5"
    >
      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4">
        <legend className="mb-4 font-display text-lg font-semibold">
          {bg.family.addContactTitle}
        </legend>
        <TextField
          id="new-contact-name"
          name="displayName"
          label={bg.family.contactName}
          maxLength={60}
          autoComplete="off"
          invalid={invalidField === "displayName"}
          errorId={errorId}
        />
        <TextField
          id="new-contact-phone"
          name="phone"
          label={bg.family.contactPhone}
          hint={bg.family.phoneHint}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          maxLength={30}
          mono
          invalid={invalidField === "phone"}
          errorId={errorId}
        />
        <div>
          <Button type="submit" variant="secondary">
            <UserPlus className="size-5" aria-hidden="true" />
            {bg.family.addContactButton}
          </Button>
        </div>
      </fieldset>
      <FormMessage notice={notice} id={errorId} />
    </form>
  );
}
