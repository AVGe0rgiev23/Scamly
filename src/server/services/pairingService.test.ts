// Unit tests for device pairing (pairingService.ts), BUILD_PLAN section 5.
//
// Instead of Supabase, the service gets an in-memory "fake world": a few plain
// arrays that behave like our tables, including what RLS would let each caller see.
// So these tests run in milliseconds, with no network. The real SQL rules (RLS,
// cascades) are tested separately in supabase/tests/*.test.sql.

import { beforeEach, describe, expect, it } from "vitest";
import type { AppRole } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { loadActor, type Actor, type ActorReader } from "@/server/auth/actor";
import { checkRole } from "@/server/auth/requireRole";
import type { AuditEntry } from "@/server/repositories/auditRepository";
import {
  createPairingCode,
  DEVICE_EMAIL_DOMAIN,
  redeemPairingCode,
  revokeDevice,
  type PairingDeps,
} from "@/server/services/pairingService";

// --- The fake world ----------------------------------------------------------------

const OWNER = "owner-anna";
const CONTACT = "contact-boris"; // a trusted contact of Баба Мария, not the owner
const STRANGER = "stranger-eve"; // no link to Баба Мария at all
const PERSON = "person-maria";
const OTHER_PERSON = "person-petar";
const IP = "203.0.113.7";

type FakeCode = {
  id: string;
  protected_person_id: string;
  code_hash: string;
  created_by: string;
  expires_at: Date;
  used_at: Date | null;
};

type World = {
  now: Date;
  persons: { id: string; owner_id: string; display_name: string; contacts: string[] }[];
  codes: FakeCode[];
  users: Map<string, { email: string; role: AppRole }>; // auth.users + profiles together
  devices: { id: string; user_id: string; protected_person_id: string }[];
  audit: AuditEntry[];
  hits: Map<string, number>;
  signedInEmails: string[];
  nextCodes: string[]; // the codes generateCode() hands out, in order
  failInsertDevice: boolean;
};

function newWorld(): World {
  return {
    now: new Date("2026-11-03T10:00:00Z"),
    persons: [
      { id: PERSON, owner_id: OWNER, display_name: "Баба Мария", contacts: [CONTACT] },
      { id: OTHER_PERSON, owner_id: STRANGER, display_name: "Дядо Петър", contacts: [] },
    ],
    codes: [],
    users: new Map([
      [OWNER, { email: "anna@example.com", role: "family" }],
      [CONTACT, { email: "boris@example.com", role: "family" }],
      [STRANGER, { email: "eve@example.com", role: "family" }],
    ]),
    devices: [],
    audit: [],
    hits: new Map(),
    signedInEmails: [],
    nextCodes: [],
    failInsertDevice: false,
  };
}

let counter = 0;
function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

// What RLS would show `callerId` (null = guest): the owner, trusted contacts and
// the person's own paired phone see the person.
function canSeePerson(world: World, callerId: string | null, personId: string): boolean {
  const person = world.persons.find((p) => p.id === personId);
  if (!person || callerId === null) return false;
  if (person.owner_id === callerId || person.contacts.includes(callerId)) return true;
  return world.devices.some((d) => d.protected_person_id === personId && d.user_id === callerId);
}

// The fake deps for one request made by `callerId`.
function depsFor(world: World, callerId: string | null): PairingDeps {
  return {
    now: () => world.now,
    generateCode: () => world.nextCodes.shift() ?? String(100000 + counter++).slice(-6),
    pairingPepper: "p".repeat(32),
    hashPepper: "h".repeat(32),
    // hit_rate_limit(): one endless window, enough for these tests.
    hitCounter: async (key, maxHits) => {
      const count = (world.hits.get(key) ?? 0) + 1;
      world.hits.set(key, count);
      return count <= maxHits;
    },
    findPersonForCaller: async (personId) => {
      if (!canSeePerson(world, callerId, personId)) return null;
      const person = world.persons.find((p) => p.id === personId);
      return person ? { id: person.id, owner_id: person.owner_id } : null;
    },
    findDeviceForCaller: async (deviceId) => {
      const device = world.devices.find((d) => d.id === deviceId);
      if (!device) return null;
      const visible =
        device.user_id === callerId || canSeePerson(world, callerId, device.protected_person_id);
      return visible ? device : null;
    },
    findPersonName: async (personId) =>
      world.persons.find((p) => p.id === personId)?.display_name ?? null,
    cancelUnusedCodes: async (personId) => {
      world.codes = world.codes.filter(
        (c) => !(c.protected_person_id === personId && c.used_at === null),
      );
    },
    insertCode: async (code) => {
      const clash = world.codes.some((c) => c.code_hash === code.codeHash && c.used_at === null);
      if (clash) return "duplicate";
      world.codes.push({
        id: newId("code"),
        protected_person_id: code.protectedPersonId,
        code_hash: code.codeHash,
        created_by: code.createdBy,
        expires_at: code.expiresAt,
        used_at: null,
      });
      return "inserted";
    },
    // Like the single UPDATE … WHERE used_at IS NULL AND expires_at > now RETURNING.
    consumeCode: async (codeHash, now) => {
      const code = world.codes.find(
        (c) => c.code_hash === codeHash && c.used_at === null && c.expires_at > now,
      );
      if (!code) return null;
      code.used_at = now;
      return {
        id: code.id,
        protected_person_id: code.protected_person_id,
        created_by: code.created_by,
      };
    },
    createAuthUser: async (account) => {
      const id = newId("device-user");
      world.users.set(id, { email: account.email, role: "family" }); // trigger: 'family' first
      return id;
    },
    // Deleting an auth user cascades to its profile and device row.
    deleteAuthUser: async (userId) => {
      world.users.delete(userId);
      world.devices = world.devices.filter((d) => d.user_id !== userId);
    },
    makeProtected: async (userId) => {
      const user = world.users.get(userId);
      if (user) user.role = "protected";
    },
    insertDevice: async (device) => {
      if (world.failInsertDevice) throw new Error("database is down");
      const id = newId("device");
      world.devices.push({
        id,
        user_id: device.userId,
        protected_person_id: device.protectedPersonId,
      });
      return id;
    },
    signInDevice: async (email) => {
      world.signedInEmails.push(email);
    },
    writeAudit: async (entry) => {
      world.audit.push(entry);
    },
  };
}

// getActor()'s questions, answered from the fake world. A deleted account is
// rejected by "Supabase Auth", like auth.getUser() does for a revoked phone.
function actorReaderFor(world: World, userId: string): ActorReader {
  return {
    getUserId: async () => (world.users.has(userId) ? userId : null),
    getProfile: async (id) => {
      const user = world.users.get(id);
      if (!user) return null;
      return { id, role: user.role, display_name: "x", email_alerts: true, created_at: "" };
    },
    getOwnDevice: async (id) => world.devices.find((d) => d.user_id === id) ?? null,
  };
}

function familyActor(userId: string): Actor {
  return {
    userId,
    role: "family",
    profile: { id: userId, role: "family", display_name: "x", email_alerts: true, created_at: "" },
    device: null,
  };
}

// --- Tests ---------------------------------------------------------------------------

let world: World;
beforeEach(() => {
  world = newWorld();
});

describe("createPairingCode", () => {
  it("gives the owner a 6-digit code that expires in 10 minutes", async () => {
    const result = await createPairingCode(depsFor(world, OWNER), familyActor(OWNER), PERSON);
    expect(result.code).toMatch(/^\d{6}$/);
    expect(result.expiresAt).toBe("2026-11-03T10:10:00.000Z");
    expect(world.audit.map((e) => e.action)).toEqual(["pairing_code_created"]);
  });

  it("stores only the HMAC of the code, never the code itself", async () => {
    const { code } = await createPairingCode(depsFor(world, OWNER), familyActor(OWNER), PERSON);
    expect(world.codes).toHaveLength(1);
    expect(world.codes[0]?.code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(world.codes)).not.toContain(code);
    expect(JSON.stringify(world.audit)).not.toContain(code);
  });

  it("answers 404 to a stranger, so they can't learn that the person exists", async () => {
    await expect(
      createPairingCode(depsFor(world, STRANGER), familyActor(STRANGER), PERSON),
    ).rejects.toMatchObject({ status: 404 });
    expect(world.codes).toHaveLength(0);
  });

  it("answers 404 to a trusted contact too: only the owner may pair a phone", async () => {
    await expect(
      createPairingCode(depsFor(world, CONTACT), familyActor(CONTACT), PERSON),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("cancels the older unused code when a new one is made", async () => {
    world.nextCodes = ["111111", "222222"];
    await createPairingCode(depsFor(world, OWNER), familyActor(OWNER), PERSON);
    await createPairingCode(depsFor(world, OWNER), familyActor(OWNER), PERSON);
    expect(world.codes).toHaveLength(1);
    await expect(
      redeemPairingCode(depsFor(world, null), { code: "111111" }, IP),
    ).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      redeemPairingCode(depsFor(world, null), { code: "222222" }, IP),
    ).resolves.toBeTruthy();
  });

  it("draws a new code when the same 6 digits are already active for someone else", async () => {
    world.nextCodes = ["333333", "333333", "444444"];
    await createPairingCode(depsFor(world, STRANGER), familyActor(STRANGER), OTHER_PERSON);
    const result = await createPairingCode(depsFor(world, OWNER), familyActor(OWNER), PERSON);
    expect(result.code).toBe("444444");
  });
});

describe("redeemPairingCode", () => {
  async function newCode(): Promise<string> {
    const { code } = await createPairingCode(depsFor(world, OWNER), familyActor(OWNER), PERSON);
    return code;
  }

  it("pairs the phone with a valid code: new protected account, device row, session", async () => {
    const code = await newCode();
    const result = await redeemPairingCode(depsFor(world, null), { code, label: "Нокия" }, IP);

    expect(result.protectedPersonId).toBe(PERSON);
    expect(result.displayName).toBe("Баба Мария");
    const device = world.devices.find((d) => d.id === result.deviceId);
    expect(device?.protected_person_id).toBe(PERSON);

    const account = world.users.get(device?.user_id ?? "");
    expect(account?.role).toBe("protected");
    expect(account?.email).toMatch(new RegExp(`^device-[0-9a-f-]{36}@${DEVICE_EMAIL_DOMAIN}$`));
    expect(world.signedInEmails).toEqual([account?.email]);
    expect(world.audit.map((e) => e.action)).toEqual(["pairing_code_created", "device_paired"]);

    // The phone is now a logged-in 'protected' actor linked to Баба Мария.
    const actor = await loadActor(actorReaderFor(world, device?.user_id ?? ""));
    expect(actor).toMatchObject({ role: "protected", device: { protectedPersonId: PERSON } });
  });

  it("answers 400 with the generic message for a wrong code, and creates nothing", async () => {
    const code = await newCode();
    const wrong = code === "000000" ? "000001" : "000000";
    await expect(
      redeemPairingCode(depsFor(world, null), { code: wrong }, IP),
    ).rejects.toMatchObject({
      status: 400,
      code: "invalid_code",
      messageBg: bg.pairing.invalidCode,
    });
    expect(world.devices).toHaveLength(0);
    expect(world.users.size).toBe(3);
  });

  it("answers 400 with the same message for an expired code", async () => {
    const code = await newCode();
    world.now = new Date("2026-11-03T10:10:01Z"); // 10 minutes and 1 second later
    await expect(redeemPairingCode(depsFor(world, null), { code }, IP)).rejects.toMatchObject({
      status: 400,
      messageBg: bg.pairing.invalidCode,
    });
  });

  it("answers 400 with the same message when the code was already used", async () => {
    const code = await newCode();
    await redeemPairingCode(depsFor(world, null), { code }, IP);
    await expect(
      redeemPairingCode(depsFor(world, null), { code }, "198.51.100.1"),
    ).rejects.toMatchObject({
      status: 400,
      messageBg: bg.pairing.invalidCode,
    });
    expect(world.devices).toHaveLength(1);
  });

  it("answers 429 on the 6th try within 15 minutes from one IP, even with the right code", async () => {
    const code = await newCode();
    const wrong = code === "000000" ? "000001" : "000000";
    for (let i = 0; i < 5; i++) {
      await expect(
        redeemPairingCode(depsFor(world, null), { code: wrong }, IP),
      ).rejects.toMatchObject({
        status: 400,
      });
    }
    await expect(redeemPairingCode(depsFor(world, null), { code }, IP)).rejects.toMatchObject({
      status: 429,
      messageBg: bg.errors.rateLimited,
    });
    expect(world.devices).toHaveLength(0);
  });

  it("answers 429 after 100 tries from everybody together (many IPs)", async () => {
    for (let i = 0; i < 100; i++) {
      await expect(
        redeemPairingCode(depsFor(world, null), { code: "999999" }, `10.0.0.${i}`),
      ).rejects.toMatchObject({ status: 400 });
    }
    await expect(
      redeemPairingCode(depsFor(world, null), { code: "999999" }, "10.0.1.1"),
    ).rejects.toMatchObject({ status: 429 });
  });

  it("counts invalid input too, and answers it with a format message", async () => {
    await expect(
      redeemPairingCode(depsFor(world, null), { code: "12ab" }, IP),
    ).rejects.toMatchObject({
      issues: [expect.objectContaining({ message: bg.pairing.codeFormat })],
    });
    expect([...world.hits.values()]).toEqual([1, 1]); // per-IP and global
  });

  it("deletes the half-made phone account when a later step fails", async () => {
    const code = await newCode();
    world.failInsertDevice = true;
    await expect(redeemPairingCode(depsFor(world, null), { code }, IP)).rejects.toThrow(
      "database is down",
    );
    expect(world.users.size).toBe(3); // only Anna, Boris and Eve are left
  });
});

describe("revokeDevice", () => {
  async function pairedDevice(): Promise<{ deviceId: string; deviceUserId: string }> {
    const { code } = await createPairingCode(depsFor(world, OWNER), familyActor(OWNER), PERSON);
    const { deviceId } = await redeemPairingCode(depsFor(world, null), { code }, IP);
    const deviceUserId = world.devices.find((d) => d.id === deviceId)?.user_id ?? "";
    return { deviceId, deviceUserId };
  }

  it("lets the owner remove the phone: its account and device row are gone", async () => {
    const { deviceId, deviceUserId } = await pairedDevice();
    await revokeDevice(depsFor(world, OWNER), familyActor(OWNER), deviceId);
    expect(world.devices).toHaveLength(0);
    expect(world.users.has(deviceUserId)).toBe(false);
    expect(world.audit.at(-1)?.action).toBe("device_revoked");
  });

  it("answers 404 to a stranger and to a trusted contact, and keeps the phone", async () => {
    const { deviceId } = await pairedDevice();
    await expect(
      revokeDevice(depsFor(world, STRANGER), familyActor(STRANGER), deviceId),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      revokeDevice(depsFor(world, CONTACT), familyActor(CONTACT), deviceId),
    ).rejects.toMatchObject({ status: 404 });
    expect(world.devices).toHaveLength(1);
  });

  it("answers 404 for a device that doesn't exist", async () => {
    await expect(
      revokeDevice(depsFor(world, OWNER), familyActor(OWNER), "no-such-device"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("logs the revoked phone out: getActor() returns null and the API answers 401", async () => {
    const { deviceId, deviceUserId } = await pairedDevice();
    expect(await loadActor(actorReaderFor(world, deviceUserId))).not.toBeNull();

    await revokeDevice(depsFor(world, OWNER), familyActor(OWNER), deviceId);

    const actor = await loadActor(actorReaderFor(world, deviceUserId));
    expect(actor).toBeNull();
    expect(() => checkRole(actor, ["protected"])).toThrow(expect.objectContaining({ status: 401 }));
  });
});
