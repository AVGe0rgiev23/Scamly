// Trusted contacts: the ordered list of people to call / alert for one protected
// person (W2-08, BUILD_PLAN 3 #11). PUT /api/persons/:id/contacts replaces the list.
//
// Only the USER client is used (no service role): RLS lets only the owner write,
// and the column privileges stop anyone from setting user_id (which account a
// contact is). The whole list is saved by ONE SQL function call, in ONE transaction
// (replace_trusted_contacts, migration 20261104000002), so places can be swapped.
//
// The rules we check here first, so the person gets a clear Bulgarian message:
//   1. only the owner (anyone else: 404, as if the person did not exist)
//   2. every contact id must belong to this person
//   3. the owner's own row (user_id = owner) must stay in the list
//   4. a contact WITHOUT an account needs a phone number (else nobody can call them)
// (1–5 contacts, places 1–5 used once and the phone format are already checked by
// ContactsSchema in src/schemas/contacts.ts.)

import "server-only";
import { bg } from "@/i18n/bg";
import type { ContactInput } from "@/schemas/contacts";
import type { Actor } from "@/server/auth/actor";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import {
  listContacts,
  replaceContacts as replaceContactsQuery,
  type ContactRow,
  type ContactWrite,
} from "@/server/repositories/contactsRepository";
import { findPersonById } from "@/server/repositories/personsRepository";
import type { DbClient } from "@/server/supabase/userClient";

// What the API sends back for one contact. The account id itself is never sent:
// `hasAccount` is enough for the screen.
export type ContactDto = {
  id: string;
  displayName: string;
  phone: string | null;
  priority: number;
  hasAccount: boolean; // true = this relative has a Scamly account and gets alerts
  isOwner: boolean; // true = the owner's own row (it can't be removed)
};

export function toContactDto(row: ContactRow, ownerId: string): ContactDto {
  return {
    id: row.id,
    displayName: row.display_name,
    phone: row.phone,
    priority: row.priority,
    hasAccount: row.user_id !== null,
    isOwner: row.user_id === ownerId,
  };
}

// Everything the contact service needs from the outside world. The real one uses
// the caller's own (user) client; the tests pass an in-memory fake.
export type ContactDeps = {
  findPersonForCaller: (personId: string) => Promise<{ id: string; owner_id: string } | null>;
  listContactsForCaller: (personId: string) => Promise<ContactRow[]>;
  replaceContactsForCaller: (
    personId: string,
    contacts: ContactWrite[],
  ) => Promise<"ok" | "changed">;
};

// PUT /api/persons/:id/contacts (family, owner only). `contacts` is the checked
// ContactsSchema list. Returns the saved list, place 1 first.
export async function replaceContacts(
  deps: ContactDeps,
  actor: Actor,
  personId: string,
  contacts: ContactInput[],
): Promise<ContactDto[]> {
  // Rule 1: lock 1 is RLS (a stranger gets null), then only the owner.
  const person = await deps.findPersonForCaller(personId);
  if (person === null || person.owner_id !== actor.userId) {
    throw notFound();
  }

  const current = await deps.listContactsForCaller(personId);

  // Rule 2: only ids of this person's contacts (e.g. not a contact of another person).
  for (const contact of contacts) {
    if (contact.id !== undefined && !current.some((row) => row.id === contact.id)) {
      throw badRequest("unknown_contact", bg.contacts.unknownContact);
    }
  }

  // Rule 3: the owner's own row stays.
  const ownerRow = current.find((row) => row.user_id === person.owner_id);
  if (ownerRow !== undefined && !contacts.some((contact) => contact.id === ownerRow.id)) {
    throw badRequest("owner_required", bg.contacts.ownerRequired);
  }

  // Rule 4: a contact without an account needs a phone. (A new contact never has an
  // account: accounts are attached only when an invite is redeemed.)
  for (const contact of contacts) {
    const existing = current.find((row) => row.id === contact.id);
    const hasAccount = existing !== undefined && existing.user_id !== null;
    if (!hasAccount && contact.phone === null) {
      throw badRequest("phone_required", bg.contacts.phoneRequired);
    }
  }

  // Only these four fields go to the database. Even if a browser sent a "userId",
  // it was already dropped by the schema, and there is no field for it here.
  const rows: ContactWrite[] = contacts.map((contact) => ({
    id: contact.id ?? null,
    displayName: contact.displayName,
    phone: contact.phone,
    priority: contact.priority,
  }));
  const result = await deps.replaceContactsForCaller(personId, rows);
  if (result === "changed") {
    // The list changed in between (e.g. in another tab): reload and try again.
    throw conflict("contacts_changed", bg.contacts.unknownContact);
  }

  const saved = await deps.listContactsForCaller(personId);
  return saved.map((row) => toContactDto(row, person.owner_id));
}

// The real deps: the caller's own Supabase client (RLS applies everywhere).
export function createContactDeps(user: DbClient): ContactDeps {
  return {
    findPersonForCaller: (personId) => findPersonById(user, personId),
    listContactsForCaller: (personId) => listContacts(user, personId),
    replaceContactsForCaller: (personId, contacts) =>
      replaceContactsQuery(user, personId, contacts),
  };
}
