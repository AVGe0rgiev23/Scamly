// An in-memory "fake world" for the unit tests of personService, contactService
// and inviteService (W2-08): plain arrays that behave like our tables, including
// what RLS would let each caller see. No network, no database: the real SQL rules
// are tested separately in supabase/tests/*.test.sql.

import type { AuditEntry } from "@/server/repositories/auditRepository";
import type { ContactRow } from "@/server/repositories/contactsRepository";
import type { PersonDeviceRow } from "@/server/repositories/devicesRepository";
import type { PersonRow } from "@/server/repositories/personsRepository";
import type { Actor } from "@/server/auth/actor";

// The people in our story. Anna owns Баба Мария; Boris is Баба Мария's trusted
// contact WITH an account (not the owner); Eve owns another person (a stranger to
// Баба Мария); Ivan has an account but is in nobody's list yet.
export const OWNER = "owner-anna";
export const CONTACT = "contact-boris";
export const STRANGER = "stranger-eve";
export const NEWCOMER = "newcomer-ivan";

export const PERSON = "a1000000-0000-4000-8000-000000000001"; // Баба Мария (Anna's)
export const OTHER_PERSON = "b1000000-0000-4000-8000-000000000002"; // Дядо Петър (Eve's)

// Contact ids are uuids, because the contact list goes through ContactsSchema.
export const ANNA_ROW = "c0000000-0000-4000-8000-000000000001";
export const BORIS_ROW = "c0000000-0000-4000-8000-000000000002";
export const GERGANA_ROW = "c0000000-0000-4000-8000-000000000003"; // neighbour, phone only
export const EVE_ROW = "c0000000-0000-4000-8000-000000000004"; // in Дядо Петър's list

export type FakeDevice = PersonDeviceRow & { protected_person_id: string };

export type FakeInvite = {
  id: string;
  protected_person_id: string;
  display_name: string;
  priority: number;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
};

export type World = {
  now: Date;
  persons: PersonRow[];
  contacts: ContactRow[];
  devices: FakeDevice[];
  invites: FakeInvite[];
  deletedUsers: string[]; // accounts deleted through the admin API
  audit: AuditEntry[];
  calls: string[]; // the order of important steps, e.g. "deleteAuthUser", "deletePerson"
};

export function newWorld(): World {
  return {
    now: new Date("2026-11-04T10:00:00Z"),
    persons: [
      {
        id: PERSON,
        owner_id: OWNER,
        display_name: "Баба Мария",
        district_code: "BG-02",
        created_at: "2026-11-01T10:00:00Z",
      },
      {
        id: OTHER_PERSON,
        owner_id: STRANGER,
        display_name: "Дядо Петър",
        district_code: "BG-16",
        created_at: "2026-11-01T11:00:00Z",
      },
    ],
    contacts: [
      contact(ANNA_ROW, PERSON, OWNER, "Анна", null, 1),
      contact(BORIS_ROW, PERSON, CONTACT, "Борис", "+359888111222", 2),
      contact(GERGANA_ROW, PERSON, null, "Съседката Гергана", "+359888333444", 3),
      contact(EVE_ROW, OTHER_PERSON, STRANGER, "Ева", null, 1),
    ],
    devices: [
      {
        id: "device-1",
        user_id: "device-user-1",
        protected_person_id: PERSON,
        label: "Телефонът на баба",
        paired_at: "2026-11-02T10:00:00Z",
        revoked_at: null,
      },
      {
        id: "device-2",
        user_id: "device-user-2",
        protected_person_id: PERSON,
        label: null,
        paired_at: "2026-11-03T10:00:00Z",
        revoked_at: null,
      },
      {
        id: "device-3",
        user_id: "device-user-3",
        protected_person_id: OTHER_PERSON,
        label: null,
        paired_at: "2026-11-03T10:00:00Z",
        revoked_at: null,
      },
    ],
    invites: [],
    deletedUsers: [],
    audit: [],
    calls: [],
  };
}

export function contact(
  id: string,
  personId: string,
  userId: string | null,
  displayName: string,
  phone: string | null,
  priority: number,
): ContactRow {
  return {
    id,
    protected_person_id: personId,
    user_id: userId,
    display_name: displayName,
    phone,
    priority,
  };
}

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

// What RLS (has_family_access) would show `callerId`: the owner and trusted contacts
// with an account see the person, its contacts and its phones.
export function hasAccess(world: World, callerId: string, personId: string): boolean {
  const person = world.persons.find((p) => p.id === personId);
  if (person === undefined) return false;
  if (person.owner_id === callerId) return true;
  return world.contacts.some((c) => c.protected_person_id === personId && c.user_id === callerId);
}

export function isOwnerOf(world: World, callerId: string, personId: string): boolean {
  return world.persons.some((p) => p.id === personId && p.owner_id === callerId);
}

// The contact list of a person, place 1 first (like ORDER BY priority).
export function contactsOf(world: World, personId: string): ContactRow[] {
  return world.contacts
    .filter((c) => c.protected_person_id === personId)
    .sort((a, b) => a.priority - b.priority);
}

export function familyActor(userId: string): Actor {
  return {
    userId,
    role: "family",
    profile: { id: userId, role: "family", display_name: "x", email_alerts: true, created_at: "" },
    device: null,
  };
}
