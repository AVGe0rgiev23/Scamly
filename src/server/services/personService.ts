// Protected persons (the older people a family member looks after).
//
//   createPerson()        POST   /api/persons      family; the caller becomes the owner
//   listPersonsForActor() GET    /api/persons      every person the caller has access to
//   getPersonDetails()    GET    /api/persons/:id  family with access: person, contacts, phones
//   updatePerson()        PATCH  /api/persons/:id  owner: rename, change district
//   deletePerson()        DELETE /api/persons/:id  owner: delete the person and all their data
//
// Everything uses the USER client, so RLS checks every row. The only exception is
// deletePerson(): signing out the person's phones (deleting their accounts) and the
// audit line need the service role, exactly as when one phone is revoked
// (pairingService.revokeDevice, BUILD_PLAN 2.4 uses 2 and 6).

import "server-only";
import type { Actor } from "@/server/auth/actor";
import { writeAudit, type AuditEntry } from "@/server/repositories/auditRepository";
import { deleteAuthUser } from "@/server/repositories/authUsersRepository";
import { listContacts, type ContactRow } from "@/server/repositories/contactsRepository";
import {
  listDevicesForPerson,
  type PersonDeviceRow,
} from "@/server/repositories/devicesRepository";
import {
  deletePerson as deletePersonQuery,
  findPersonById,
  insertPerson,
  listPersons,
  updatePerson as updatePersonQuery,
  type PersonRow,
} from "@/server/repositories/personsRepository";
import { notFound } from "@/server/http/errors";
import { toContactDto, type ContactDto } from "@/server/services/contactService";
import type { CreatePersonInput, UpdatePersonInput } from "@/schemas/persons";
import type { DbClient } from "@/server/supabase/userClient";

// What the API sends back for one person (camelCase for JavaScript).
export type PersonDto = {
  id: string;
  displayName: string;
  districtCode: string;
  createdAt: string;
  isOwner: boolean; // true = I created this person; false = I am one of their contacts
};

// One paired phone, as the family sees it. The phone's account id is never sent.
export type DeviceDto = {
  id: string;
  label: string | null;
  pairedAt: string;
  revoked: boolean;
};

// GET /api/persons/:id: the person, their contact list (place 1 first) and phones.
export type PersonDetailsDto = {
  person: PersonDto;
  contacts: ContactDto[];
  devices: DeviceDto[];
};

function toDto(row: PersonRow, actor: Actor): PersonDto {
  return {
    id: row.id,
    displayName: row.display_name,
    districtCode: row.district_code,
    createdAt: row.created_at,
    isOwner: row.owner_id === actor.userId,
  };
}

function toDeviceDto(row: PersonDeviceRow): DeviceDto {
  return {
    id: row.id,
    label: row.label,
    pairedAt: row.paired_at,
    revoked: row.revoked_at !== null,
  };
}

// Creates a person owned by the caller. The DB trigger adds the caller as contact #1.
export async function createPerson(
  client: DbClient,
  actor: Actor,
  input: CreatePersonInput,
): Promise<PersonDto> {
  const row = await insertPerson(client, {
    ownerId: actor.userId,
    displayName: input.displayName,
    districtCode: input.districtCode,
  });
  return toDto(row, actor);
}

// Every person the caller has access to (owner or trusted contact): RLS filters.
export async function listPersonsForActor(client: DbClient, actor: Actor): Promise<PersonDto[]> {
  const rows = await listPersons(client);
  return rows.map((row) => toDto(row, actor));
}

// ---------------------------------------------------------------------------------
// Details, update, delete (W2-08). The outside world comes in `deps` objects, so the
// tests can pass in-memory fakes (like passing objects into a Python function).
// ---------------------------------------------------------------------------------

// Reads and writes with the caller's own (user) client: RLS decides.
export type PersonDeps = {
  findPersonForCaller: (personId: string) => Promise<PersonRow | null>;
  listContactsForCaller: (personId: string) => Promise<ContactRow[]>;
  listDevicesForCaller: (personId: string) => Promise<PersonDeviceRow[]>;
  updatePersonForCaller: (
    personId: string,
    changes: { displayName?: string; districtCode?: string },
  ) => Promise<PersonRow | null>;
  deletePersonForCaller: (personId: string) => Promise<boolean>;
};

// The two steps of deletePerson() that need the service role.
export type PersonAdminDeps = {
  deleteAuthUser: (userId: string) => Promise<void>;
  writeAudit: (entry: AuditEntry) => Promise<void>;
};

// GET /api/persons/:id (family with access: the owner or a trusted contact).
export async function getPersonDetails(
  deps: PersonDeps,
  actor: Actor,
  personId: string,
): Promise<PersonDetailsDto> {
  // RLS returns null to anyone without access, so they get 404.
  const person = await deps.findPersonForCaller(personId);
  if (person === null) {
    throw notFound();
  }
  const contacts = await deps.listContactsForCaller(personId);
  const devices = await deps.listDevicesForCaller(personId);
  return {
    person: toDto(person, actor),
    contacts: contacts.map((row) => toContactDto(row, person.owner_id)),
    devices: devices.map(toDeviceDto),
  };
}

// PATCH /api/persons/:id (owner only).
export async function updatePerson(
  deps: PersonDeps,
  actor: Actor,
  personId: string,
  input: UpdatePersonInput,
): Promise<PersonDto> {
  // A trusted contact can SEE the person but may not change it: also 404.
  const person = await deps.findPersonForCaller(personId);
  if (person === null || person.owner_id !== actor.userId) {
    throw notFound();
  }
  const updated = await deps.updatePersonForCaller(personId, {
    displayName: input.displayName,
    districtCode: input.districtCode,
  });
  if (updated === null) {
    throw notFound(); // deleted in the meantime
  }
  return toDto(updated, actor);
}

// DELETE /api/persons/:id (owner only): the person and ALL their data.
export async function deletePerson(
  deps: PersonDeps,
  admin: PersonAdminDeps,
  actor: Actor,
  personId: string,
): Promise<{ devicesRevoked: number }> {
  const person = await deps.findPersonForCaller(personId);
  if (person === null || person.owner_id !== actor.userId) {
    throw notFound();
  }

  // 1. Sign out every paired phone FIRST, the same way as revoking one phone:
  //    deleting its account kills its refresh token (its next request gets 401).
  //    If we deleted the person first, the device rows would be gone (cascade) and
  //    we would no longer know which accounts to delete.
  const devices = await deps.listDevicesForCaller(personId);
  for (const device of devices) {
    await admin.deleteAuthUser(device.user_id);
    await admin.writeAudit({
      actorId: actor.userId,
      action: "device_revoked",
      targetType: "device",
      targetId: device.id,
      details: { protected_person_id: personId, reason: "person_deleted" },
    });
  }

  // 2. Delete the person (user client, RLS: owner only). The database deletes the
  //    contacts, invites, pairing codes, checks and alerts with it (cascade).
  const deleted = await deps.deletePersonForCaller(personId);
  if (!deleted) {
    throw notFound();
  }

  // 3. Audit line. No name in it: the person's data is meant to be gone (GDPR).
  await admin.writeAudit({
    actorId: actor.userId,
    action: "person_deleted",
    targetType: "protected_person",
    targetId: personId,
    details: { devices_revoked: devices.length },
  });
  return { devicesRevoked: devices.length };
}

// The real deps: `user` = the caller's own client (RLS applies).
export function createPersonDeps(user: DbClient): PersonDeps {
  return {
    findPersonForCaller: (personId) => findPersonById(user, personId),
    listContactsForCaller: (personId) => listContacts(user, personId),
    listDevicesForCaller: (personId) => listDevicesForPerson(user, personId),
    updatePersonForCaller: (personId, changes) => updatePersonQuery(user, personId, changes),
    deletePersonForCaller: (personId) => deletePersonQuery(user, personId),
  };
}

// `admin` = the service-role client, only for deletePerson() (see the top of the file).
export function createPersonAdminDeps(admin: DbClient): PersonAdminDeps {
  return {
    deleteAuthUser: (userId) => deleteAuthUser(admin, userId),
    writeAudit: (entry) => writeAudit(admin, entry),
  };
}
