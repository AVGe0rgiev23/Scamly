// Unit tests for GET / PATCH / DELETE /api/persons/:id (personService.ts, W2-08),
// on the in-memory fake world (src/server/services/__tests__/familyWorld.ts).

import { beforeEach, describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import { UpdatePersonSchema } from "@/schemas/persons";
import {
  deletePerson,
  getPersonDetails,
  updatePerson,
  type PersonAdminDeps,
  type PersonDeps,
} from "@/server/services/personService";
import {
  CONTACT,
  contactsOf,
  familyActor,
  hasAccess,
  isOwnerOf,
  newWorld,
  OTHER_PERSON,
  OWNER,
  PERSON,
  STRANGER,
  type World,
} from "@/server/services/__tests__/familyWorld";

let world: World;

beforeEach(() => {
  world = newWorld();
});

// The fake deps for one request made by `callerId` (RLS rules as in migration 4).
function depsFor(callerId: string): PersonDeps {
  return {
    findPersonForCaller: async (personId) => {
      if (!hasAccess(world, callerId, personId)) return null;
      return world.persons.find((p) => p.id === personId) ?? null;
    },
    listContactsForCaller: async (personId) =>
      hasAccess(world, callerId, personId) ? contactsOf(world, personId) : [],
    listDevicesForCaller: async (personId) =>
      hasAccess(world, callerId, personId)
        ? world.devices.filter((d) => d.protected_person_id === personId)
        : [],
    // RLS UPDATE / DELETE policies: owner only, otherwise 0 rows.
    updatePersonForCaller: async (personId, changes) => {
      const person = world.persons.find((p) => p.id === personId);
      if (!person || !isOwnerOf(world, callerId, personId)) return null;
      if (changes.displayName !== undefined) person.display_name = changes.displayName;
      if (changes.districtCode !== undefined) person.district_code = changes.districtCode;
      return person;
    },
    deletePersonForCaller: async (personId) => {
      if (!isOwnerOf(world, callerId, personId)) return false;
      world.calls.push("deletePerson");
      // on delete cascade
      world.persons = world.persons.filter((p) => p.id !== personId);
      world.contacts = world.contacts.filter((c) => c.protected_person_id !== personId);
      world.devices = world.devices.filter((d) => d.protected_person_id !== personId);
      return true;
    },
  };
}

const adminDeps: PersonAdminDeps = {
  // Deleting a phone's account also deletes its device row (cascade).
  deleteAuthUser: async (userId) => {
    world.calls.push("deleteAuthUser");
    world.deletedUsers.push(userId);
    world.devices = world.devices.filter((d) => d.user_id !== userId);
  },
  writeAudit: async (entry) => {
    world.audit.push(entry);
  },
};

describe("getPersonDetails", () => {
  it("shows the owner the person, the ordered contacts and the phones", async () => {
    const details = await getPersonDetails(depsFor(OWNER), familyActor(OWNER), PERSON);
    expect(details.person).toMatchObject({ displayName: "Баба Мария", isOwner: true });
    expect(details.contacts).toEqual([
      {
        id: expect.any(String),
        displayName: "Анна",
        phone: null,
        priority: 1,
        hasAccount: true,
        isOwner: true,
      },
      expect.objectContaining({
        displayName: "Борис",
        priority: 2,
        hasAccount: true,
        isOwner: false,
      }),
      expect.objectContaining({ displayName: "Съседката Гергана", priority: 3, hasAccount: false }),
    ]);
    expect(details.devices).toEqual([
      {
        id: "device-1",
        label: "Телефонът на баба",
        pairedAt: "2026-11-02T10:00:00Z",
        revoked: false,
      },
      { id: "device-2", label: null, pairedAt: "2026-11-03T10:00:00Z", revoked: false },
    ]);
  });

  it("never sends account ids (user_id) to the browser", async () => {
    const details = await getPersonDetails(depsFor(OWNER), familyActor(OWNER), PERSON);
    const text = JSON.stringify(details);
    expect(text).not.toContain(OWNER);
    expect(text).not.toContain(CONTACT);
    expect(text).not.toContain("device-user-1");
  });

  it("shows a trusted contact the same page, marked as not the owner", async () => {
    const details = await getPersonDetails(depsFor(CONTACT), familyActor(CONTACT), PERSON);
    expect(details.person.isOwner).toBe(false);
    expect(details.contacts).toHaveLength(3);
  });

  it("404 for a stranger", async () => {
    await expect(
      getPersonDetails(depsFor(STRANGER), familyActor(STRANGER), PERSON),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("updatePerson", () => {
  it("lets the owner rename the person and change the district", async () => {
    const input = UpdatePersonSchema.parse({
      displayName: "  Баба Мария Иванова ",
      districtCode: "BG-03",
    });
    const person = await updatePerson(depsFor(OWNER), familyActor(OWNER), PERSON, input);
    expect(person).toMatchObject({ displayName: "Баба Мария Иванова", districtCode: "BG-03" });
  });

  it("404 for a trusted contact who is not the owner, and for a stranger", async () => {
    const input = UpdatePersonSchema.parse({ displayName: "Променено" });
    for (const caller of [CONTACT, STRANGER]) {
      await expect(
        updatePerson(depsFor(caller), familyActor(caller), PERSON, input),
      ).rejects.toMatchObject({ status: 404 });
    }
    expect(world.persons.find((p) => p.id === PERSON)?.display_name).toBe("Баба Мария");
  });

  it("needs at least one field to change", () => {
    const result = UpdatePersonSchema.safeParse({});
    expect(result.error?.issues[0]?.message).toBe(bg.persons.nothingToChange);
  });
});

describe("deletePerson", () => {
  it("signs out every phone first, then deletes the person and all their data", async () => {
    const result = await deletePerson(depsFor(OWNER), adminDeps, familyActor(OWNER), PERSON);
    expect(result).toEqual({ devicesRevoked: 2 });
    expect(world.deletedUsers.sort()).toEqual(["device-user-1", "device-user-2"]);
    // The phones' accounts are deleted BEFORE the person (so we still know them).
    expect(world.calls).toEqual(["deleteAuthUser", "deleteAuthUser", "deletePerson"]);
    expect(world.persons.map((p) => p.id)).toEqual([OTHER_PERSON]);
    expect(contactsOf(world, PERSON)).toEqual([]);
    // The other person's phone is untouched.
    expect(world.devices.map((d) => d.id)).toEqual(["device-3"]);
  });

  it("writes an audit line per phone and one for the person, without names", async () => {
    await deletePerson(depsFor(OWNER), adminDeps, familyActor(OWNER), PERSON);
    expect(world.audit.map((a) => a.action)).toEqual([
      "device_revoked",
      "device_revoked",
      "person_deleted",
    ]);
    expect(world.audit[2]).toMatchObject({
      actorId: OWNER,
      targetType: "protected_person",
      targetId: PERSON,
      details: { devices_revoked: 2 },
    });
    expect(JSON.stringify(world.audit)).not.toContain("Баба Мария");
  });

  it("404 for a trusted contact who is not the owner and for a stranger: nothing deleted", async () => {
    for (const caller of [CONTACT, STRANGER]) {
      await expect(
        deletePerson(depsFor(caller), adminDeps, familyActor(caller), PERSON),
      ).rejects.toMatchObject({ status: 404 });
    }
    expect(world.deletedUsers).toEqual([]);
    expect(world.persons).toHaveLength(2);
    expect(world.audit).toEqual([]);
  });
});
