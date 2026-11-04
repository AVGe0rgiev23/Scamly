// Unit tests for PUT /api/persons/:id/contacts (contactService.ts, W2-08), on the
// in-memory fake world (src/server/services/__tests__/familyWorld.ts). The fake
// replace function behaves like the SQL function replace_trusted_contacts()
// (whose real behaviour is tested in supabase/tests/11_replace_contacts.test.sql).

import { beforeEach, describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import { ContactsSchema } from "@/schemas/contacts";
import type { ContactWrite } from "@/server/repositories/contactsRepository";
import { replaceContacts, type ContactDeps } from "@/server/services/contactService";
import {
  ANNA_ROW,
  BORIS_ROW,
  CONTACT,
  contactsOf,
  EVE_ROW,
  familyActor,
  GERGANA_ROW,
  hasAccess,
  isOwnerOf,
  newId,
  newWorld,
  OWNER,
  PERSON,
  STRANGER,
  type World,
} from "@/server/services/__tests__/familyWorld";

let world: World;
let sentRows: ContactWrite[][]; // what the service sent to the database, per call
let databaseSaysChanged: boolean;

beforeEach(() => {
  world = newWorld();
  sentRows = [];
  databaseSaysChanged = false;
});

// The fake deps for one request made by `callerId`.
function depsFor(callerId: string): ContactDeps {
  return {
    findPersonForCaller: async (personId) => {
      if (!hasAccess(world, callerId, personId)) return null;
      return world.persons.find((p) => p.id === personId) ?? null;
    },
    listContactsForCaller: async (personId) =>
      hasAccess(world, callerId, personId) ? contactsOf(world, personId) : [],
    // Like replace_trusted_contacts(): owner only, keeps ids and user_id of listed
    // rows, deletes the others, adds new rows WITHOUT an account.
    replaceContactsForCaller: async (personId, rows) => {
      sentRows.push(rows);
      if (!isOwnerOf(world, callerId, personId)) throw new Error("42501");
      if (databaseSaysChanged) return "changed";
      const others = world.contacts.filter((c) => c.protected_person_id !== personId);
      const current = contactsOf(world, personId);
      const next = rows.map((row) => {
        const existing = current.find((c) => c.id === row.id);
        return {
          id: existing ? existing.id : newId("contact"),
          protected_person_id: personId,
          user_id: existing ? existing.user_id : null,
          display_name: row.displayName,
          phone: row.phone,
          priority: row.priority,
        };
      });
      world.contacts = [...others, ...next];
      return "ok";
    },
  };
}

// Sends a list through the real ContactsSchema (as the route does), then the service.
function put(callerId: string, body: unknown) {
  return replaceContacts(
    depsFor(callerId),
    familyActor(callerId),
    PERSON,
    ContactsSchema.parse(body),
  );
}

describe("replaceContacts: who may change the list", () => {
  const body = [{ id: ANNA_ROW, displayName: "Анна", priority: 1 }];

  it("404 for a trusted contact who is not the owner, and the list stays", async () => {
    await expect(put(CONTACT, body)).rejects.toMatchObject({ status: 404 });
    expect(contactsOf(world, PERSON)).toHaveLength(3);
    expect(sentRows).toHaveLength(0);
  });

  it("404 for a stranger (RLS hides the person)", async () => {
    await expect(put(STRANGER, body)).rejects.toMatchObject({ status: 404 });
    expect(sentRows).toHaveLength(0);
  });
});

describe("replaceContacts: the owner's changes", () => {
  it("swaps places and keeps every account (user_id)", async () => {
    const saved = await put(OWNER, [
      { id: BORIS_ROW, displayName: "Борис", phone: "0888 111 222", priority: 1 },
      { id: ANNA_ROW, displayName: "Анна", priority: 2 },
      { id: GERGANA_ROW, displayName: "Гергана", phone: "+359888333444", priority: 3 },
    ]);
    expect(saved.map((c) => [c.displayName, c.priority, c.hasAccount, c.isOwner])).toEqual([
      ["Борис", 1, true, false],
      ["Анна", 2, true, true],
      ["Гергана", 3, false, false],
    ]);
    const rows = contactsOf(world, PERSON);
    expect(rows.find((c) => c.id === BORIS_ROW)?.user_id).toBe(CONTACT);
    expect(rows.find((c) => c.id === ANNA_ROW)?.user_id).toBe(OWNER);
    // The phone is stored in one format (E.164).
    expect(rows.find((c) => c.id === BORIS_ROW)?.phone).toBe("+359888111222");
  });

  it("deletes contacts that are left out and adds new ones without an account", async () => {
    const saved = await put(OWNER, [
      { id: ANNA_ROW, displayName: "Анна", priority: 1 },
      { displayName: "Иван", phone: "0877 123 456", priority: 2 },
    ]);
    expect(saved.map((c) => c.displayName)).toEqual(["Анна", "Иван"]);
    expect(world.contacts.some((c) => c.id === BORIS_ROW || c.id === GERGANA_ROW)).toBe(false);
    expect(saved[1]).toMatchObject({ hasAccount: false, phone: "+359877123456" });
  });

  it("ignores an account id sent by the browser", async () => {
    await put(OWNER, [
      { id: ANNA_ROW, displayName: "Анна", priority: 1 },
      // A tampered request tries to attach Eve's account to a new contact and to
      // move Boris's row to Eve.
      { id: BORIS_ROW, displayName: "Борис", priority: 2, userId: STRANGER, user_id: STRANGER },
      { displayName: "Натрапник", phone: "0888 999 000", priority: 3, user_id: STRANGER },
    ]);
    // Nothing about accounts even reached the database call...
    for (const row of sentRows[0] ?? []) {
      expect(Object.keys(row).sort()).toEqual(["displayName", "id", "phone", "priority"]);
    }
    // ...and the saved list has Boris's account where it was, and none for the new one.
    const rows = contactsOf(world, PERSON);
    expect(rows.map((c) => c.user_id)).toEqual([OWNER, CONTACT, null]);
    expect(world.contacts.filter((c) => c.user_id === STRANGER)).toHaveLength(1); // only Eve's own row
  });

  it("400 when the owner's own row is missing, and nothing is saved", async () => {
    const result = put(OWNER, [{ id: BORIS_ROW, displayName: "Борис", priority: 1 }]);
    await expect(result).rejects.toMatchObject({
      status: 400,
      code: "owner_required",
      messageBg: bg.contacts.ownerRequired,
    });
    expect(sentRows).toHaveLength(0);
    expect(contactsOf(world, PERSON)).toHaveLength(3);
  });

  it("400 for a contact id of another person (e.g. Eve's contact)", async () => {
    const result = put(OWNER, [
      { id: ANNA_ROW, displayName: "Анна", priority: 1 },
      { id: EVE_ROW, displayName: "Откраднат", priority: 2 },
    ]);
    await expect(result).rejects.toMatchObject({ status: 400, code: "unknown_contact" });
    expect(world.contacts.find((c) => c.id === EVE_ROW)?.display_name).toBe("Ева");
  });

  it("400 for a contact without an account and without a phone", async () => {
    const result = put(OWNER, [
      { id: ANNA_ROW, displayName: "Анна", priority: 1 },
      { displayName: "Без телефон", priority: 2 },
    ]);
    await expect(result).rejects.toMatchObject({ status: 400, code: "phone_required" });
  });

  it("allows contacts WITH an account to have no phone (they get alerts in the app)", async () => {
    const saved = await put(OWNER, [
      { id: ANNA_ROW, displayName: "Анна", phone: "", priority: 1 },
      { id: BORIS_ROW, displayName: "Борис", phone: null, priority: 2 },
    ]);
    expect(saved.map((c) => c.phone)).toEqual([null, null]);
  });

  it("409 when the database refuses because the list changed at the same moment", async () => {
    databaseSaysChanged = true;
    const result = put(OWNER, [{ id: ANNA_ROW, displayName: "Анна", priority: 1 }]);
    await expect(result).rejects.toMatchObject({ status: 409, code: "contacts_changed" });
  });
});

describe("ContactsSchema (the list rules checked before the service)", () => {
  it("refuses two contacts on the same place", () => {
    const result = ContactsSchema.safeParse([
      { id: ANNA_ROW, displayName: "Анна", priority: 1 },
      { id: BORIS_ROW, displayName: "Борис", priority: 1 },
    ]);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(bg.contacts.priorityTaken);
  });

  it("refuses the same contact twice", () => {
    const result = ContactsSchema.safeParse([
      { id: ANNA_ROW, displayName: "Анна", priority: 1 },
      { id: ANNA_ROW, displayName: "Анна", priority: 2 },
    ]);
    expect(result.error?.issues[0]?.message).toBe(bg.contacts.contactTwice);
  });
});
