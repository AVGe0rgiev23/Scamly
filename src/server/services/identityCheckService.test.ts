// Unit tests for „Провери истинския“ (identityCheckService.ts, D34, task P-05).
//
// Like checkService.test.ts, the service gets an in-memory "fake world": plain arrays
// that behave like our tables, including what RLS would let each caller see and do.
// The real RLS rules are tested in supabase/tests/15_identity_checks.test.sql.

import { beforeEach, describe, expect, it } from "vitest";
import type { AppRole } from "@/config/routes";
import { bg } from "@/i18n/bg";
import type { Actor } from "@/server/auth/actor";
import { ApiError } from "@/server/http/errors";
import type { PushMessage } from "@/server/notifications/pushSender";
import type { AuditEntry } from "@/server/repositories/auditRepository";
import type { IdentityCheckRow } from "@/server/repositories/identityChecksRepository";
import type { ContactRef } from "@/server/services/alertService";
import {
  ANSWER_WINDOW_MS,
  answerIdentityCheck,
  askFamilyMember,
  getIdentityCheck,
  initialsOf,
  listFamilyForPhone,
  listMyIdentityChecks,
  type IdentityCheckDeps,
} from "@/server/services/identityCheckService";

// --- The fake world ----------------------------------------------------------------

const ANNA = "user-anna"; // owner of Мария (contact #1)
const IVAN = "user-ivan"; // Мария's son, contact #2 with an account
const ELENA = "user-elena"; // Мария's granddaughter, contact #4 with an account
const EVE = "user-eve"; // owner of Петър, a stranger to Мария
const PHONE = "user-phone-maria";
const PHONE_2 = "user-phone-maria-2"; // Мария's tablet
const OTHER_PHONE = "user-phone-petar";
const MARIA = "person-maria";
const PETAR = "person-petar";

type World = {
  now: Date;
  roles: Map<string, AppRole>;
  names: Map<string, string>;
  contacts: Map<string, ContactRef[]>;
  devices: { id: string; userId: string; personId: string }[];
  rows: IdentityCheckRow[];
  audit: AuditEntry[];
  pushes: { userId: string; message: PushMessage }[];
  hits: Map<string, number>;
  failPush: boolean;
  raceOnInsert: boolean; // another question of the same phone was stored at the same moment
  raceOnAnswer: boolean; // the row changed between the read and the update
};

function newWorld(): World {
  return {
    now: new Date("2026-11-26T10:00:00Z"),
    roles: new Map<string, AppRole>([
      [ANNA, "family"],
      [IVAN, "family"],
      [ELENA, "family"],
      [EVE, "family"],
      [PHONE, "protected"],
      [PHONE_2, "protected"],
      [OTHER_PHONE, "protected"],
    ]),
    names: new Map([
      [MARIA, "Мария"],
      [PETAR, "Петър"],
    ]),
    contacts: new Map([
      [
        MARIA,
        [
          { user_id: ANNA, display_name: "Анна", phone: null, priority: 1 },
          { user_id: IVAN, display_name: "Иван Петров", phone: "+359888111222", priority: 2 },
          { user_id: null, display_name: "Пенка", phone: "+359899333444", priority: 3 },
          { user_id: ELENA, display_name: "Елена", phone: null, priority: 4 },
        ],
      ],
      [PETAR, [{ user_id: EVE, display_name: "Ева", phone: null, priority: 1 }]],
    ]),
    devices: [
      { id: "device-maria", userId: PHONE, personId: MARIA },
      { id: "device-maria-2", userId: PHONE_2, personId: MARIA },
      { id: "device-petar", userId: OTHER_PHONE, personId: PETAR },
    ],
    rows: [],
    audit: [],
    pushes: [],
    hits: new Map(),
    failPush: false,
    raceOnInsert: false,
    raceOnAnswer: false,
  };
}

let idCounter = 0;

// What RLS lets `callerId` see about a person: the family (owner or a contact with an
// account) and the person's own phones.
function isFamily(world: World, callerId: string, personId: string): boolean {
  return (world.contacts.get(personId) ?? []).some((c) => c.user_id === callerId);
}
function deviceOfUser(world: World, callerId: string) {
  return world.devices.find((d) => d.userId === callerId);
}
function canSeeRow(world: World, callerId: string, row: IdentityCheckRow): boolean {
  if (isFamily(world, callerId, row.protected_person_id)) return true;
  const device = deviceOfUser(world, callerId);
  return device !== undefined && device.id === row.device_id;
}

function depsFor(world: World, callerId: string): IdentityCheckDeps {
  return {
    now: () => world.now,
    hitCounter: async (key, maxHits) => {
      const count = (world.hits.get(key) ?? 0) + 1;
      world.hits.set(key, count);
      return count <= maxHits;
    },
    findPersonForCaller: async (personId) => {
      const name = world.names.get(personId);
      const device = deviceOfUser(world, callerId);
      const allowed = isFamily(world, callerId, personId) || device?.personId === personId;
      return name !== undefined && allowed ? { id: personId, display_name: name } : null;
    },
    listContactsForCaller: async (personId) => {
      const device = deviceOfUser(world, callerId);
      const allowed = isFamily(world, callerId, personId) || device?.personId === personId;
      return allowed ? (world.contacts.get(personId) ?? []) : [];
    },
    // Like the RLS insert policy + the "expire the previous one" trigger.
    insertForCaller: async (check) => {
      const device = deviceOfUser(world, callerId);
      if (
        device === undefined ||
        device.id !== check.deviceId ||
        device.personId !== check.protectedPersonId ||
        !isFamily(world, check.claimedUserId, check.protectedPersonId) ||
        world.roles.get(check.claimedUserId) !== "family" ||
        !isFamily(world, check.askedUserId, check.protectedPersonId) ||
        world.roles.get(check.askedUserId) !== "family"
      ) {
        return "refused";
      }
      if (world.raceOnInsert) return "busy";
      for (const row of world.rows) {
        if (row.device_id === check.deviceId && row.status === "pending") row.status = "expired";
      }
      idCounter += 1;
      const row: IdentityCheckRow = {
        id: `identity-${idCounter}`,
        protected_person_id: check.protectedPersonId,
        device_id: check.deviceId,
        claimed_user_id: check.claimedUserId,
        asked_user_id: check.askedUserId,
        status: "pending",
        created_at: world.now.toISOString(),
        answered_at: null,
      };
      world.rows.push(row);
      return { ...row };
    },
    findForCaller: async (checkId) => {
      const row = world.rows.find((r) => r.id === checkId);
      return row !== undefined && canSeeRow(world, callerId, row) ? { ...row } : null;
    },
    listRecentForCaller: async (since, limit) =>
      world.rows
        .filter((r) => r.created_at > since && canSeeRow(world, callerId, r))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, limit)
        .map((r) => ({ ...r })),
    // Like UPDATE … WHERE id AND asked_user_id = me AND status = 'pending' AND created_at > notBefore.
    answerForCaller: async (check) => {
      const row = world.rows.find((r) => r.id === check.id);
      if (
        row === undefined ||
        world.raceOnAnswer ||
        row.asked_user_id !== check.userId ||
        row.status !== "pending" ||
        row.created_at <= check.notBefore
      ) {
        return null;
      }
      row.status = check.answer;
      row.answered_at = world.now.toISOString();
      return { ...row };
    },
    writeAudit: async (entry) => {
      world.audit.push(entry);
    },
    sendPush: async (userId, message) => {
      if (world.failPush) throw new Error("push service down");
      world.pushes.push({ userId, message });
    },
  };
}

function actorFor(world: World, userId: string): Actor {
  const role = world.roles.get(userId) ?? "family";
  const device = deviceOfUser(world, userId);
  return {
    userId,
    role,
    profile: {
      id: userId,
      role,
      display_name: `profile-${userId}`,
      email_alerts: true,
      created_at: "",
    },
    device:
      role === "protected" && device ? { id: device.id, protectedPersonId: device.personId } : null,
  };
}

async function errorOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("expected an ApiError");
}

// Мария's phone asks `userId` „Ти ли си?“.
function ask(world: World, userId: string, phone: string = PHONE) {
  return askFamilyMember(depsFor(world, phone), actorFor(world, phone), { claimedUserId: userId });
}

// Мария's phone asks `askedUserId` whether it is really `claimedUserId` (the chain).
function askAbout(world: World, claimedUserId: string, askedUserId: string) {
  return askFamilyMember(depsFor(world, PHONE), actorFor(world, PHONE), {
    claimedUserId,
    askedUserId,
  });
}

let world: World;
beforeEach(() => {
  world = newWorld();
});

// --- Tests -----------------------------------------------------------------------------

describe("initialsOf", () => {
  it("takes the first letter of at most two words", () => {
    expect(initialsOf("Иван Петров")).toBe("ИП");
    expect(initialsOf("  иван ")).toBe("И");
    expect(initialsOf("Мария Иванова Петрова")).toBe("МИ");
  });
});

describe("GET /api/identity-checks/family (the phone's tiles)", () => {
  it("lists the person's contacts in calling order with saved numbers", async () => {
    const result = await listFamilyForPhone(depsFor(world, PHONE), actorFor(world, PHONE));
    expect(result.people.map((p) => p.displayName)).toEqual([
      "Анна",
      "Иван Петров",
      "Пенка",
      "Елена",
    ]);
    expect(result.people[1]).toEqual({
      userId: IVAN,
      displayName: "Иван Петров",
      initials: "ИП",
      phone: "+359888111222",
      priority: 2,
      canReceive: true,
    });
    expect(result.people[2]?.canReceive).toBe(false); // Пенка has no account
  });

  it("is for phones only", async () => {
    const error = await errorOf(listFamilyForPhone(depsFor(world, IVAN), actorFor(world, IVAN)));
    expect(error.status).toBe(403);
  });
});

describe("POST /api/identity-checks (the phone asks)", () => {
  it("stores a pending question and pushes „Ти ли си?“ to the claimed member only", async () => {
    const dto = await ask(world, IVAN);
    expect(dto).toMatchObject({
      protectedPersonId: MARIA,
      personName: "Мария",
      claimedUserId: IVAN,
      claimedName: "Иван Петров",
      claimedPhone: "+359888111222",
      askedUserId: IVAN,
      askedName: "Иван Петров",
      status: "pending",
      answeredAt: null,
      secondsToAnswer: null,
    });
    expect(Date.parse(dto.answerableUntil) - Date.parse(dto.createdAt)).toBe(ANSWER_WINDOW_MS);
    expect(world.pushes).toHaveLength(1);
    expect(world.pushes[0]?.userId).toBe(IVAN);
    expect(world.pushes[0]?.message.body).toBe(
      "Някой се представя за теб пред Мария и иска пари. Ти ли си?",
    );
    expect(world.pushes[0]?.message.url).toBe(`/family/proveri?id=${dto.id}`);
  });

  it("refuses someone outside the family and a contact without an account (400)", async () => {
    expect((await errorOf(ask(world, EVE))).code).toBe("not_family");
    expect((await errorOf(ask(world, "no-such-user"))).code).toBe("not_family");
    expect(world.rows).toHaveLength(0);
    expect(world.pushes).toHaveLength(0);
  });

  it("maps a refusal by the database (e.g. not a family account) to 400", async () => {
    world.roles.set(ELENA, "moderator");
    const error = await errorOf(ask(world, ELENA));
    expect(error.status).toBe(400);
    expect(error.messageBg).toBe(bg.identityChecks.notFamily);
  });

  it("chain: asking the next member expires the previous pending question", async () => {
    const first = await ask(world, IVAN);
    world.now = new Date(world.now.getTime() + 45_000);
    const second = await ask(world, ELENA);
    expect(world.rows.find((r) => r.id === first.id)?.status).toBe("expired");
    expect(second.status).toBe("pending");
    // A late „Не съм аз“ to the old question is refused.
    const late = await errorOf(
      answerIdentityCheck(depsFor(world, IVAN), actorFor(world, IVAN), first.id, "not_me"),
    );
    expect(late.status).toBe(409);
  });

  it("claimed ≠ asked: Елена is asked whether it is really Иван", async () => {
    const dto = await askAbout(world, IVAN, ELENA);
    expect(dto).toMatchObject({
      claimedUserId: IVAN,
      claimedName: "Иван Петров",
      claimedPhone: "+359888111222", // the call-back goes to the CLAIMED person's number
      askedUserId: ELENA,
      askedName: "Елена",
      status: "pending",
    });
    expect(world.rows[0]).toMatchObject({ claimed_user_id: IVAN, asked_user_id: ELENA });
    expect(world.pushes.map((p) => p.userId)).toEqual([ELENA]);
    expect(world.pushes[0]?.message.title).toBe("Някой се представя за Иван Петров");
    expect(world.pushes[0]?.message.body).toBe(
      "Някой се представя за Иван Петров пред Мария и иска пари. Знаеш ли дали наистина е Иван Петров?",
    );
  });

  it("refuses an asked person outside the family or without an account (400)", async () => {
    expect((await errorOf(askAbout(world, IVAN, EVE))).code).toBe("not_family");
    expect((await errorOf(askAbout(world, IVAN, "no-such-user"))).code).toBe("not_family");
    expect((await errorOf(askAbout(world, EVE, ELENA))).code).toBe("not_family");
    world.roles.set(ELENA, "moderator");
    expect((await errorOf(askAbout(world, IVAN, ELENA))).status).toBe(400);
    expect(world.rows).toHaveLength(0);
    expect(world.pushes).toHaveLength(0);
  });

  it("answers 409 when two questions of the same phone race", async () => {
    world.raceOnInsert = true;
    expect((await errorOf(ask(world, IVAN))).status).toBe(409);
  });

  it("allows 20 questions per phone per hour, then 429", async () => {
    for (let i = 0; i < 20; i += 1) {
      await ask(world, IVAN);
    }
    expect((await errorOf(ask(world, IVAN))).status).toBe(429);
  });

  it("still answers 201 when the push fails (the live row reaches open pages)", async () => {
    world.failPush = true;
    const dto = await ask(world, IVAN);
    expect(dto.status).toBe("pending");
  });

  it("is for phones only", async () => {
    const error = await errorOf(
      askFamilyMember(depsFor(world, ANNA), actorFor(world, ANNA), { claimedUserId: IVAN }),
    );
    expect(error.status).toBe(403);
  });
});

describe("PATCH /api/identity-checks/:id (the answer)", () => {
  it("„Не съм аз“: stores the answer, audits it and warns the rest of the family", async () => {
    const question = await ask(world, IVAN);
    world.pushes = [];
    world.now = new Date(world.now.getTime() + 12_000);
    const dto = await answerIdentityCheck(
      depsFor(world, IVAN),
      actorFor(world, IVAN),
      question.id,
      "not_me",
    );
    expect(dto.status).toBe("not_me");
    expect(dto.secondsToAnswer).toBe(12);
    expect(world.audit).toEqual([
      {
        actorId: IVAN,
        action: "identity_not_me",
        targetType: "identity_check",
        targetId: question.id,
        details: { protected_person_id: MARIA },
      },
    ]);
    // Anna and Елена, not Ivan himself, not Пенка (no account), not Ева (another family).
    expect(world.pushes.map((p) => p.userId).sort()).toEqual([ANNA, ELENA].sort());
    expect(world.pushes[0]?.message.body).toBe(
      "Някой се представя за Иван Петров. Ако ви звънне, затворете.",
    );
  });

  it("„Аз съм“: stores the answer, no warning and no audit row", async () => {
    const question = await ask(world, IVAN);
    world.pushes = [];
    const dto = await answerIdentityCheck(
      depsFor(world, IVAN),
      actorFor(world, IVAN),
      question.id,
      "its_me",
    );
    expect(dto.status).toBe("its_me");
    expect(world.pushes).toHaveLength(0);
    expect(world.audit).toHaveLength(0);
  });

  it("only once: a second answer is 409 (compare-and-set)", async () => {
    const question = await ask(world, IVAN);
    const deps = depsFor(world, IVAN);
    await answerIdentityCheck(deps, actorFor(world, IVAN), question.id, "its_me");
    const again = await errorOf(
      answerIdentityCheck(deps, actorFor(world, IVAN), question.id, "not_me"),
    );
    expect(again.status).toBe(409);
    expect(world.rows[0]?.status).toBe("its_me");
  });

  it("answers 409 when another tab answered between the read and the write", async () => {
    const question = await ask(world, IVAN);
    world.raceOnAnswer = true;
    const error = await errorOf(
      answerIdentityCheck(depsFor(world, IVAN), actorFor(world, IVAN), question.id, "not_me"),
    );
    expect(error.code).toBe("already_answered");
    expect(world.audit).toHaveLength(0);
  });

  it("only the asked member may answer (403), another family can't even see it (404)", async () => {
    const question = await ask(world, IVAN);
    const byAnna = await errorOf(
      answerIdentityCheck(depsFor(world, ANNA), actorFor(world, ANNA), question.id, "not_me"),
    );
    expect(byAnna.status).toBe(403);
    const byEve = await errorOf(
      answerIdentityCheck(depsFor(world, EVE), actorFor(world, EVE), question.id, "not_me"),
    );
    expect(byEve.status).toBe(404);
    expect(world.rows[0]?.status).toBe("pending");
  });

  it("claimed ≠ asked: only Елена answers; the warning names Иван and reaches him too", async () => {
    const question = await askAbout(world, IVAN, ELENA);
    world.pushes = [];
    const byIvan = await errorOf(
      answerIdentityCheck(depsFor(world, IVAN), actorFor(world, IVAN), question.id, "its_me"),
    );
    expect(byIvan.status).toBe(403);
    expect(world.rows[0]?.status).toBe("pending");

    const dto = await answerIdentityCheck(
      depsFor(world, ELENA),
      actorFor(world, ELENA),
      question.id,
      "not_me",
    );
    expect(dto).toMatchObject({ status: "not_me", claimedName: "Иван Петров", askedName: "Елена" });
    expect(world.pushes.map((p) => p.userId).sort()).toEqual([ANNA, IVAN].sort());
    expect(world.pushes[0]?.message.title).toBe("Внимание! Измамник се представя за Иван Петров");
  });

  it("can't be answered after 15 minutes (409)", async () => {
    const question = await ask(world, IVAN);
    world.now = new Date(world.now.getTime() + ANSWER_WINDOW_MS);
    const error = await errorOf(
      answerIdentityCheck(depsFor(world, IVAN), actorFor(world, IVAN), question.id, "not_me"),
    );
    expect(error.status).toBe(409);
  });

  it("a failing push never fails the answer", async () => {
    const question = await ask(world, IVAN);
    world.failPush = true;
    const dto = await answerIdentityCheck(
      depsFor(world, IVAN),
      actorFor(world, IVAN),
      question.id,
      "not_me",
    );
    expect(dto.status).toBe("not_me");
    expect(world.audit).toHaveLength(1);
  });
});

describe("GET /api/identity-checks/:id", () => {
  it("the phone that asked and the family can read it", async () => {
    const question = await ask(world, IVAN);
    const byPhone = await getIdentityCheck(
      depsFor(world, PHONE),
      actorFor(world, PHONE),
      question.id,
    );
    expect(byPhone.claimedName).toBe("Иван Петров");
    const byAnna = await getIdentityCheck(depsFor(world, ANNA), actorFor(world, ANNA), question.id);
    expect(byAnna.status).toBe("pending");
  });

  it("IDOR: another phone of the same person, another person's phone and another family get 404", async () => {
    const question = await ask(world, IVAN);
    for (const caller of [PHONE_2, OTHER_PHONE, EVE]) {
      const error = await errorOf(
        getIdentityCheck(depsFor(world, caller), actorFor(world, caller), question.id),
      );
      expect(error.status).toBe(404);
    }
  });

  it("shows a pending question older than 15 minutes as expired", async () => {
    const question = await ask(world, IVAN);
    world.now = new Date(world.now.getTime() + ANSWER_WINDOW_MS + 1);
    const dto = await getIdentityCheck(depsFor(world, PHONE), actorFor(world, PHONE), question.id);
    expect(dto.status).toBe("expired");
  });
});

describe("GET /api/identity-checks (a family member's list)", () => {
  it("Ivan gets his open question; the others get the warning after „Не съм аз“", async () => {
    const question = await ask(world, IVAN);
    const before = await listMyIdentityChecks(depsFor(world, IVAN), actorFor(world, IVAN));
    expect(before.pending.map((q) => q.id)).toEqual([question.id]);
    expect(before.warnings).toEqual([]);
    const annaBefore = await listMyIdentityChecks(depsFor(world, ANNA), actorFor(world, ANNA));
    expect(annaBefore).toEqual({ pending: [], warnings: [] });

    await answerIdentityCheck(depsFor(world, IVAN), actorFor(world, IVAN), question.id, "not_me");
    const after = await listMyIdentityChecks(depsFor(world, IVAN), actorFor(world, IVAN));
    expect(after).toEqual({ pending: [], warnings: [] });
    const anna = await listMyIdentityChecks(depsFor(world, ANNA), actorFor(world, ANNA));
    expect(anna.warnings.map((q) => q.claimedName)).toEqual(["Иван Петров"]);
    const eve = await listMyIdentityChecks(depsFor(world, EVE), actorFor(world, EVE));
    expect(eve).toEqual({ pending: [], warnings: [] });
  });

  it("claimed ≠ asked: the open question is Елена's, the warning reaches Иван", async () => {
    const question = await askAbout(world, IVAN, ELENA);
    const elena = await listMyIdentityChecks(depsFor(world, ELENA), actorFor(world, ELENA));
    expect(elena.pending.map((q) => q.id)).toEqual([question.id]);
    const ivan = await listMyIdentityChecks(depsFor(world, IVAN), actorFor(world, IVAN));
    expect(ivan).toEqual({ pending: [], warnings: [] });

    await answerIdentityCheck(depsFor(world, ELENA), actorFor(world, ELENA), question.id, "not_me");
    const ivanAfter = await listMyIdentityChecks(depsFor(world, IVAN), actorFor(world, IVAN));
    expect(ivanAfter.warnings.map((q) => q.claimedName)).toEqual(["Иван Петров"]);
    const elenaAfter = await listMyIdentityChecks(depsFor(world, ELENA), actorFor(world, ELENA));
    expect(elenaAfter).toEqual({ pending: [], warnings: [] });
  });

  it("drops questions that can no longer be answered", async () => {
    await ask(world, IVAN);
    world.now = new Date(world.now.getTime() + ANSWER_WINDOW_MS);
    const list = await listMyIdentityChecks(depsFor(world, IVAN), actorFor(world, IVAN));
    expect(list.pending).toEqual([]);
  });
});
