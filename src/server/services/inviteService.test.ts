// Unit tests for invites (inviteService.ts, W2-08): creating a link and redeeming
// it, on the in-memory fake world (src/server/services/__tests__/familyWorld.ts).

import { beforeEach, describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import { CreateInviteSchema } from "@/schemas/invites";
import { hmacSha256 } from "@/server/security/hash";
import {
  choosePlacement,
  createInvite,
  generateInviteToken,
  INVITE_LIFETIME_MS,
  redeemInvite,
  type InviteDeps,
} from "@/server/services/inviteService";
import {
  ANNA_ROW,
  contact,
  CONTACT,
  contactsOf,
  familyActor,
  GERGANA_ROW,
  hasAccess,
  newId,
  newWorld,
  NEWCOMER,
  OWNER,
  PERSON,
  STRANGER,
  type World,
} from "@/server/services/__tests__/familyWorld";

const IP = "203.0.113.7";
const PEPPER = "p".repeat(32);

let world: World;
let hits: Map<string, number>;
let nextTokens: string[];
let failNextInsert: "duplicate" | "error" | null;

beforeEach(() => {
  world = newWorld();
  hits = new Map();
  nextTokens = [];
  failNextInsert = null;
});

// A token in our format (43 URL-safe characters), different for each `seed`.
function token(seed: string): string {
  return seed.padEnd(43, "x");
}

// The fake deps for one request made by `callerId`.
function depsFor(callerId: string): InviteDeps {
  return {
    now: () => world.now,
    generateToken: () => nextTokens.shift() ?? generateInviteToken(),
    tokenPepper: PEPPER,
    hashPepper: "h".repeat(32),
    hitCounter: async (key, maxHits) => {
      const count = (hits.get(key) ?? 0) + 1;
      hits.set(key, count);
      return count <= maxHits;
    },
    findPersonForCaller: async (personId) => {
      if (!hasAccess(world, callerId, personId)) return null;
      return world.persons.find((p) => p.id === personId) ?? null;
    },
    // Service role: sees everything.
    findPerson: async (personId) => world.persons.find((p) => p.id === personId) ?? null,
    listContacts: async (personId) => contactsOf(world, personId),
    insertInvite: async (invite) => {
      const id = newId("invite");
      world.invites.push({
        id,
        protected_person_id: invite.personId,
        display_name: invite.displayName,
        priority: invite.priority,
        token_hash: invite.tokenHash,
        expires_at: invite.expiresAt,
        used_at: null,
      });
      return id;
    },
    findOpenInvite: async (tokenHash, now) =>
      world.invites.find(
        (i) => i.token_hash === tokenHash && i.used_at === null && i.expires_at > now,
      ) ?? null,
    // Like the single UPDATE … WHERE used_at IS NULL AND expires_at > now.
    consumeInvite: async (inviteId, now) => {
      const invite = world.invites.find(
        (i) => i.id === inviteId && i.used_at === null && i.expires_at > now,
      );
      if (!invite) return false;
      invite.used_at = now;
      return true;
    },
    releaseInvite: async (inviteId, usedAt) => {
      const invite = world.invites.find((i) => i.id === inviteId);
      if (invite && invite.used_at?.getTime() === usedAt.getTime()) invite.used_at = null;
    },
    // The two unique rules of trusted_contacts: one contact per place, one row per account.
    insertLinkedContact: async (row) => {
      if (failNextInsert === "error") throw new Error("database is down");
      const list = contactsOf(world, row.personId);
      const clash =
        failNextInsert === "duplicate" ||
        list.some((c) => c.priority === row.priority || c.user_id === row.userId);
      if (clash) return null;
      const id = newId("contact");
      world.contacts.push(
        contact(id, row.personId, row.userId, row.displayName, null, row.priority),
      );
      return id;
    },
    linkContact: async (contactId, userId) => {
      const row = world.contacts.find((c) => c.id === contactId && c.user_id === null);
      if (!row) return false;
      row.user_id = userId;
      return true;
    },
    writeAudit: async (entry) => {
      world.audit.push(entry);
    },
  };
}

// Anna (the owner) creates an invite; returns the token from the link.
async function invite(displayName: string, priority: number, tokenSeed = "t1"): Promise<string> {
  nextTokens.push(token(tokenSeed));
  const input = CreateInviteSchema.parse({ displayName, priority });
  const result = await createInvite(depsFor(OWNER), familyActor(OWNER), PERSON, input);
  return new URLSearchParams(result.invitePath.split("?")[1]).get("t") ?? "";
}

function redeem(callerId: string, tokenValue: unknown, ip: string = IP) {
  return redeemInvite(depsFor(callerId), familyActor(callerId), { token: tokenValue }, ip);
}

describe("generateInviteToken", () => {
  it("makes 43 URL-safe characters (256 random bits), different every time", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });
});

describe("createInvite", () => {
  it("gives the owner a /pokana link valid for 7 days and stores only the HMAC", async () => {
    nextTokens.push(token("abc"));
    const input = CreateInviteSchema.parse({ displayName: "Иван", priority: 4 });
    const result = await createInvite(depsFor(OWNER), familyActor(OWNER), PERSON, input);

    expect(result.invitePath).toBe(`/pokana?t=${token("abc")}`);
    expect(new Date(result.expiresAt).getTime()).toBe(world.now.getTime() + INVITE_LIFETIME_MS);
    expect(world.invites).toHaveLength(1);
    expect(world.invites[0]?.token_hash).toBe(hmacSha256(token("abc"), PEPPER));
    expect(JSON.stringify(world.invites)).not.toContain(token("abc"));
    expect(world.audit[0]).toMatchObject({ action: "invite_created", actorId: OWNER });
    expect(JSON.stringify(world.audit)).not.toContain(token("abc"));
  });

  it("404 for a trusted contact who is not the owner, and for a stranger", async () => {
    const input = CreateInviteSchema.parse({ displayName: "Иван", priority: 4 });
    for (const caller of [CONTACT, STRANGER]) {
      await expect(
        createInvite(depsFor(caller), familyActor(caller), PERSON, input),
      ).rejects.toMatchObject({ status: 404 });
    }
    expect(world.invites).toHaveLength(0);
  });
});

describe("redeemInvite", () => {
  it("adds the caller WITH their account at the invite's place", async () => {
    const t = await invite("Иван", 4);
    const result = await redeem(NEWCOMER, t);

    expect(result).toEqual({ protectedPersonId: PERSON, personName: "Баба Мария", priority: 4 });
    expect(contactsOf(world, PERSON).at(-1)).toMatchObject({
      user_id: NEWCOMER,
      display_name: "Иван",
      priority: 4,
    });
    // From now on RLS gives Ivan access to Баба Мария.
    expect(hasAccess(world, NEWCOMER, PERSON)).toBe(true);
    expect(world.invites[0]?.used_at).toEqual(world.now);
    expect(world.audit.at(-1)).toMatchObject({ action: "invite_redeemed", actorId: NEWCOMER });
  });

  it("works only once: a second person gets the generic 400", async () => {
    const t = await invite("Иван", 4);
    await redeem(NEWCOMER, t);
    await expect(redeem(STRANGER, t)).rejects.toMatchObject({
      status: 400,
      code: "invalid_invite",
      messageBg: bg.invites.invalidInvite,
    });
    expect(hasAccess(world, STRANGER, PERSON)).toBe(false);
  });

  it("gives the same 400 for an expired and for a wrong token", async () => {
    const t = await invite("Иван", 4);
    world.now = new Date(world.now.getTime() + INVITE_LIFETIME_MS + 1);
    await expect(redeem(NEWCOMER, t)).rejects.toMatchObject({
      status: 400,
      code: "invalid_invite",
    });
    await expect(redeem(NEWCOMER, token("wrong"))).rejects.toMatchObject({
      status: 400,
      code: "invalid_invite",
    });
    // A token that can't be ours at all: a validation error with the same text.
    await expect(redeem(NEWCOMER, "1 or 1=1")).rejects.toMatchObject({
      issues: [expect.objectContaining({ message: bg.invites.invalidInvite })],
    });
    expect(hasAccess(world, NEWCOMER, PERSON)).toBe(false);
  });

  it("409 when the caller is already in the list; the invite is NOT used up", async () => {
    const t = await invite("Борис", 4);
    await expect(redeem(CONTACT, t)).rejects.toMatchObject({ status: 409, code: "already_linked" });
    expect(world.invites[0]?.used_at).toBeNull();
    expect(contactsOf(world, PERSON).filter((c) => c.user_id === CONTACT)).toHaveLength(1);
  });

  it("409 when the owner opens their own invite; the invite is NOT used up", async () => {
    const t = await invite("Иван", 4);
    await expect(redeem(OWNER, t)).rejects.toMatchObject({ status: 409, code: "own_invite" });
    expect(world.invites[0]?.used_at).toBeNull();
    // ...so Ivan can still use the same link afterwards.
    await expect(redeem(NEWCOMER, t)).resolves.toMatchObject({ priority: 4 });
  });

  it("takes the next free place when the invite's place is taken", async () => {
    const t = await invite("Иван", 2); // place 2 = Борис, 3 = Гергана
    const result = await redeem(NEWCOMER, t);
    expect(result.priority).toBe(4);
  });

  it("409 when there is no free place from the invite's place to 5", async () => {
    world.contacts.push(contact("c-4", PERSON, null, "Четвърти", "+359888000004", 4));
    world.contacts.push(contact("c-5", PERSON, null, "Пети", "+359888000005", 5));
    const t = await invite("Иван", 2);
    await expect(redeem(NEWCOMER, t)).rejects.toMatchObject({
      status: 409,
      code: "no_free_place",
      messageBg: bg.invites.noFreePlace,
    });
    expect(world.invites[0]?.used_at).toBeNull();
  });

  it("links the owner's existing phone-only row with the same name instead of adding a second one", async () => {
    const t = await invite("съседката гергана ", 3);
    const result = await redeem(NEWCOMER, t);
    expect(result.priority).toBe(3);
    const rows = contactsOf(world, PERSON);
    expect(rows).toHaveLength(3);
    expect(rows.find((c) => c.id === GERGANA_ROW)).toMatchObject({
      user_id: NEWCOMER,
      phone: "+359888333444", // the phone the owner entered stays
    });
  });

  it("gives the invite back when the place was taken at the same moment (409)", async () => {
    const t = await invite("Иван", 4);
    failNextInsert = "duplicate";
    await expect(redeem(NEWCOMER, t)).rejects.toMatchObject({
      status: 409,
      code: "contacts_changed",
    });
    expect(world.invites[0]?.used_at).toBeNull();
    failNextInsert = null;
    await expect(redeem(NEWCOMER, t)).resolves.toMatchObject({ priority: 4 });
  });

  it("gives the invite back when the database fails while adding the contact", async () => {
    const t = await invite("Иван", 4);
    failNextInsert = "error";
    await expect(redeem(NEWCOMER, t)).rejects.toThrow("database is down");
    expect(world.invites[0]?.used_at).toBeNull();
  });

  it("blocks the 11th try from one IP with 429, even with a valid token", async () => {
    const t = await invite("Иван", 4);
    for (let i = 0; i < 10; i++) {
      await expect(redeem(NEWCOMER, token(`guess${i}`))).rejects.toMatchObject({ status: 400 });
    }
    await expect(redeem(NEWCOMER, t)).rejects.toMatchObject({ status: 429 });
    // Another IP still works.
    await expect(redeem(NEWCOMER, t, "198.51.100.1")).resolves.toMatchObject({ priority: 4 });
  });
});

describe("choosePlacement", () => {
  const list = [
    contact(ANNA_ROW, PERSON, OWNER, "Анна", null, 1),
    contact(GERGANA_ROW, PERSON, null, "Гергана", "+359888333444", 3),
  ];

  it("uses the invite's place when it is free", () => {
    expect(choosePlacement(list, { display_name: "Иван", priority: 2 })).toEqual({
      kind: "add",
      priority: 2,
    });
  });

  it("does not link a phone-only row with a DIFFERENT name: it moves on", () => {
    expect(choosePlacement(list, { display_name: "Иван", priority: 3 })).toEqual({
      kind: "add",
      priority: 4,
    });
  });

  it("never links a row that already has an account", () => {
    expect(choosePlacement(list, { display_name: "Анна", priority: 1 })).toEqual({
      kind: "add",
      priority: 2,
    });
  });
});
