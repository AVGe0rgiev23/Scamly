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
"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
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

function ContactsReadOnly({ contacts }: { contacts: ContactDto[] }) {
  const sorted = [...contacts].sort((a, b) => a.priority - b.priority);
  return (
    <>
      <p className="muted">{bg.family.contactsIntro}</p>
      <ol className="contact-list">
        {sorted.map((contact) => (
          <li key={contact.id} className="contact-row">
            <p className="contact-place">{fill(bg.family.contactPlace, { n: contact.priority })}</p>
            <p className="contact-name">{contact.displayName}</p>
            <p>
              {contact.phone ? (
                <a href={`tel:${contact.phone}`} className="family-link">
                  {contact.phone}
                </a>
              ) : (
                <span className="muted">{bg.family.noPhone}</span>
              )}
            </p>
            <p className="muted">
              {contact.hasAccount ? bg.family.hasAccount : bg.family.noAccount}
            </p>
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
    <div className="contacts-editor">
      <p className="muted">{bg.family.contactsIntro}</p>
      <ol className="contact-list">
        {draft.map((row, index) => (
          <li key={row.key} className="contact-row">
            <fieldset disabled={pending} className="contact-fields">
              <legend className="contact-place">
                {fill(bg.family.contactPlace, { n: index + 1 })}
              </legend>
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
                invalid={invalidField === `${row.key}-phone`}
                errorId={errorId}
              />
              <p className="muted">
                {row.isOwner ? `${bg.family.you}. ` : ""}
                {row.hasAccount ? bg.family.hasAccount : bg.family.noAccount}
              </p>
              <div className="contact-actions">
                <Button
                  id={`${row.key}-up`}
                  variant="secondary"
                  aria-label={fill(bg.family.moveUp, { name: nameOf(row) })}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <span aria-hidden="true">↑</span>
                </Button>
                <Button
                  id={`${row.key}-down`}
                  variant="secondary"
                  aria-label={fill(bg.family.moveDown, { name: nameOf(row) })}
                  disabled={index === draft.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <span aria-hidden="true">↓</span>
                </Button>
                {row.isOwner ? null : (
                  <Button
                    variant="secondary"
                    className="contact-remove"
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
        <p className="muted">{bg.family.listFull}</p>
      )}

      {dirty ? <p className="contacts-dirty">{bg.family.unsavedChanges}</p> : null}
      <Button onClick={save} disabled={pending || !dirty}>
        {pending ? bg.family.saving : bg.family.saveContacts}
      </Button>
      <FormMessage notice={notice} id={errorId} />
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
    <form noValidate onSubmit={submit} className="family-form contact-add">
      <fieldset disabled={disabled}>
        <legend>{bg.family.addContactTitle}</legend>
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
          invalid={invalidField === "phone"}
          errorId={errorId}
        />
        <Button type="submit" variant="secondary">
          {bg.family.addContactButton}
        </Button>
      </fieldset>
      <FormMessage notice={notice} id={errorId} />
    </form>
  );
}
