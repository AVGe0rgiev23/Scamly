// Unit tests for the call check (checkService.ts): start, answers, read, list and
// „Обаждам ѝ се сега“ (BUILD_PLAN 3 #17–#22, tasks W2-02 and W2-04).
//
// Like pairingService.test.ts, the service gets an in-memory "fake world" instead of
// Supabase: plain arrays that behave like our tables, including what RLS would let
// each caller see. The real RLS rules are tested in supabase/tests/05_checks_alerts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppRole } from "@/config/routes";
import type { ExtraKeyword } from "@/engine";
import { bg } from "@/i18n/bg";
import { AnswersSchema, type AnswersInput } from "@/schemas/checks";
import type { Actor } from "@/server/auth/actor";
import type { AuditEntry } from "@/server/repositories/auditRepository";
import type { CheckAnswersUpdate, CheckRow } from "@/server/repositories/checksRepository";
import {
  acknowledge,
  acknowledgementMessage,
  CHECKS_PAGE_SIZE,
  getCheck,
  listChecks,
  startCheck,
  submitAnswers,
  type CheckDeps,
} from "@/server/services/checkService";
import type { ContactRef } from "@/server/services/alertService";

// --- The fake world ----------------------------------------------------------------

const OWNER = "owner-anna"; // owner of Мария, contact #1 (no phone yet)
const CONTACT = "contact-ivan"; // trusted contact of Мария with an account
const STRANGER = "stranger-eve"; // owner of Петър, no link to Мария
const PHONE_1 = "user-phone-1"; // Мария's phone
const PHONE_2 = "user-phone-2"; // Мария's second phone (e.g. a tablet)
const OTHER_PHONE = "user-phone-petar"; // Петър's phone
const PERSON = "person-maria";
const OTHER_PERSON = "person-petar";

type FakeDevice = { id: string; userId: string; personId: string };

type World = {
  now: Date;
  roles: Map<string, AppRole>;
  owners: Map<string, string>; // personId -> owner userId
  names: Map<string, string>; // personId -> display name
  contacts: Map<string, ContactRef[]>; // personId -> contact list
  devices: FakeDevice[];
  checks: CheckRow[];
  saved: { checkId: string; fields: CheckAnswersUpdate }[];
  audit: AuditEntry[];
  fanOutCalls: string[];
  verdictCalls: string[];
  hits: Map<string, number>;
  failFanOut: boolean;
  raceOnSave: boolean; // saveAnswers finds the check already answered
  extraKeywords: ExtraKeyword[]; // the moderators' keywords of the published cards
  failKeywords: boolean; // loading the keywords fails
};

function newWorld(): World {
  return {
    now: new Date("2026-11-09T10:00:00Z"),
    roles: new Map<string, AppRole>([
      [OWNER, "family"],
      [CONTACT, "family"],
      [STRANGER, "family"],
      [PHONE_1, "protected"],
      [PHONE_2, "protected"],
      [OTHER_PHONE, "protected"],
    ]),
    owners: new Map([
      [PERSON, OWNER],
      [OTHER_PERSON, STRANGER],
    ]),
    names: new Map([
      [PERSON, "Мария Петрова"],
      [OTHER_PERSON, "Петър Иванов"],
    ]),
    contacts: new Map([
      [
        PERSON,
        [
          { user_id: OWNER, display_name: "Анна", phone: null, priority: 1 },
          { user_id: CONTACT, display_name: "Иван", phone: "0888 111 222", priority: 2 },
          { user_id: null, display_name: "Пенка", phone: "0899 333 444", priority: 3 },
        ],
      ],
      [OTHER_PERSON, [{ user_id: STRANGER, display_name: "Ева", phone: null, priority: 1 }]],
    ]),
    devices: [
      { id: "device-1", userId: PHONE_1, personId: PERSON },
      { id: "device-2", userId: PHONE_2, personId: PERSON },
      { id: "device-petar", userId: OTHER_PHONE, personId: OTHER_PERSON },
    ],
    checks: [],
    saved: [],
    audit: [],
    fanOutCalls: [],
    verdictCalls: [],
    hits: new Map(),
    failFanOut: false,
    raceOnSave: false,
    extraKeywords: [],
    failKeywords: false,
  };
}

let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

// A check row as the database would hold it ("started", nothing answered yet).
function startedRow(world: World, personId: string, deviceId: string | null): CheckRow {
  return {
    id: newId("check"),
    protected_person_id: personId,
    device_id: deviceId,
    status: "started",
    claimed_identity: null,
    asks_money: null,
    handover: null,
    rushing: null,
    secrecy: null,
    text_redacted: null,
    caller_number_hash: null,
    score: null,
    risk_level: null,
    script_type: null,
    hard_rules: [],
    reason_codes: [],
    engine_version: null,
    escalation_due_at: null,
    escalation_exhausted_at: null,
    ai_provider: null,
    ai_level: null,
    acknowledged_by: null,
    acknowledged_at: null,
    started_at: world.now.toISOString(),
    answered_at: null,
  };
}

// What RLS would show `callerId`: the owner, contacts with an account and the
// person's own (not revoked) phones see the person, its contacts and its checks.
function canSeePerson(world: World, callerId: string, personId: string): boolean {
  if (world.owners.get(personId) === callerId) return true;
  const contacts = world.contacts.get(personId) ?? [];
  if (contacts.some((c) => c.user_id === callerId)) return true;
  return world.devices.some((d) => d.personId === personId && d.userId === callerId);
}

// The fake deps for requests made by `callerId`.
function depsFor(world: World, callerId: string): CheckDeps {
  return {
    now: () => world.now,
    hitCounter: async (key, maxHits) => {
      const count = (world.hits.get(key) ?? 0) + 1;
      world.hits.set(key, count);
      return count <= maxHits;
    },
    findCheckForCaller: async (checkId) => {
      const check = world.checks.find((c) => c.id === checkId);
      if (!check || !canSeePerson(world, callerId, check.protected_person_id)) return null;
      return { ...check }; // a copy, like a fresh database read
    },
    listChecksForCaller: async (personId, before, limit) => {
      if (!canSeePerson(world, callerId, personId)) return [];
      return world.checks
        .filter((c) => c.protected_person_id === personId)
        .filter((c) => before === null || c.started_at < before)
        .sort((a, b) => (a.started_at < b.started_at ? 1 : -1))
        .slice(0, limit);
    },
    findPersonForCaller: async (personId) => {
      const name = world.names.get(personId);
      if (name === undefined || !canSeePerson(world, callerId, personId)) return null;
      return { id: personId, display_name: name };
    },
    listContactsForCaller: async (personId) =>
      canSeePerson(world, callerId, personId) ? (world.contacts.get(personId) ?? []) : [],
    listAlertedChecksForCaller: async () => [],
    insertCheck: async (check) => {
      const row = startedRow(world, check.protectedPersonId, check.deviceId);
      world.checks.push(row);
      return row.id;
    },
    // Like UPDATE … WHERE id = $1 AND status = 'started'.
    saveAnswers: async (checkId, fields) => {
      const check = world.checks.find((c) => c.id === checkId);
      if (!check || check.status !== "started" || world.raceOnSave) return "not_started";
      world.saved.push({ checkId, fields });
      Object.assign(check, fields, { status: "answered" });
      return "saved";
    },
    // Like UPDATE … WHERE id = $1 AND acknowledged_by IS NULL.
    markAcknowledged: async (checkId, userId, at) => {
      const check = world.checks.find((c) => c.id === checkId);
      if (!check || check.acknowledged_by !== null) return "already";
      check.acknowledged_by = userId;
      check.acknowledged_at = at.toISOString();
      return "acknowledged";
    },
    writeAudit: async (entry) => {
      world.audit.push(entry);
    },
    fanOutAlerts: async (checkId) => {
      if (world.failFanOut) throw new Error("database is down");
      world.fanOutCalls.push(checkId);
    },
    notifyVerdict: async (checkId) => {
      world.verdictCalls.push(checkId);
    },
    loadExtraKeywords: async () => {
      if (world.failKeywords) throw new Error("database is down");
      return world.extraKeywords;
    },
  };
}

// The actor getActor() would build for `userId`.
function actorFor(world: World, userId: string): Actor {
  const role = world.roles.get(userId) ?? "family";
  const device = world.devices.find((d) => d.userId === userId);
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

// Answers through the real Zod schema, as the route does.
function answers(input: Record<string, unknown>): AnswersInput {
  return AnswersSchema.parse(input);
}

// The police + money scenario of the brief (hard rule HR1).
const POLICE_AND_MONEY = {
  claimedIdentity: "police",
  asksMoney: "yes",
  handover: "courier_or_stranger",
  rushing: "yes",
  secrecy: "no",
};

// Runs `promise` and returns what it threw (for checking status codes).
async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected an error");
}

let world: World;
beforeEach(() => {
  world = newWorld();
});
afterEach(() => {
  vi.restoreAllMocks();
});

// --- 1. POST /api/checks ----------------------------------------------------------

describe("startCheck", () => {
  it("creates a 'started' check for the phone's own person and alerts the family", async () => {
    const result = await startCheck(depsFor(world, PHONE_1), actorFor(world, PHONE_1));

    expect(world.checks).toHaveLength(1);
    expect(world.checks[0]).toMatchObject({
      id: result.checkId,
      protected_person_id: PERSON,
      device_id: "device-1",
      status: "started",
    });
    expect(world.fanOutCalls).toEqual([result.checkId]);
  });

  it("refuses a family account (only a paired phone may start a check)", async () => {
    const error = await errorOf(startCheck(depsFor(world, OWNER), actorFor(world, OWNER)));
    expect(error).toMatchObject({ status: 403 });
    expect(world.checks).toHaveLength(0);
  });

  it("allows 10 checks per phone per hour, then answers 429", async () => {
    for (let i = 0; i < 10; i++) {
      await startCheck(depsFor(world, PHONE_1), actorFor(world, PHONE_1));
    }
    const error = await errorOf(startCheck(depsFor(world, PHONE_1), actorFor(world, PHONE_1)));
    expect(error).toMatchObject({ status: 429, code: "rate_limited" });
    expect(world.checks).toHaveLength(10);

    // The limit is per phone: the second phone may still start a check.
    await startCheck(depsFor(world, PHONE_2), actorFor(world, PHONE_2));
    expect(world.checks).toHaveLength(11);
  });

  it("still returns the check when the alert fan-out fails (and logs it)", async () => {
    world.failFanOut = true;
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await startCheck(depsFor(world, PHONE_1), actorFor(world, PHONE_1));

    expect(result.checkId).toBe(world.checks[0]?.id);
    expect(log).toHaveBeenCalledOnce();
  });
});

// --- 2. PUT /api/checks/:id/answers -----------------------------------------------

describe("submitAnswers", () => {
  async function startOn(phone: string): Promise<string> {
    return (await startCheck(depsFor(world, phone), actorFor(world, phone))).checkId;
  }

  it("police + money gives a red verdict with HR1, stored by the server", async () => {
    const checkId = await startOn(PHONE_1);

    const result = await submitAnswers(
      depsFor(world, PHONE_1),
      actorFor(world, PHONE_1),
      checkId,
      answers(POLICE_AND_MONEY),
    );

    expect(result.verdict.level).toBe("red");
    expect(result.verdict.hardRules).toContain("HR1_POLICE_ASKS_MONEY");
    expect(result.verdict.headlineBg).toBe(bg.verdict.red.title);
    expect(result.verdict.reasons.length).toBeGreaterThan(0);

    const saved = world.saved[0]?.fields;
    expect(saved).toMatchObject({
      claimed_identity: "police",
      asks_money: "yes",
      risk_level: "red",
      text_redacted: null,
      answered_at: world.now.toISOString(),
    });
    expect(saved?.hard_rules).toContain("HR1_POLICE_ASKS_MONEY");
    expect(saved?.reason_codes).toContain("HR1_POLICE_ASKS_MONEY");
    expect(saved?.engine_version).toBe("1.0.0");
    expect(world.checks[0]?.status).toBe("answered");
    expect(world.verdictCalls).toEqual([checkId]);
  });

  // W3-05: a moderator teaches the engine a new phrase through a published scam card.
  const PRIZE_TEXT = "Спечелихте томбола, обадете се.";
  const TEXT_ONLY = {
    claimedIdentity: null,
    asksMoney: null,
    rushing: null,
    secrecy: null,
    text: PRIZE_TEXT,
  };

  it("a moderator's keyword is found in the text and appears in the reasons", async () => {
    const before = await submitAnswers(
      depsFor(world, PHONE_1),
      actorFor(world, PHONE_1),
      await startOn(PHONE_1),
      answers(TEXT_ONLY),
    );
    expect(before.verdict.reasons.map((reason) => reason.code)).not.toContain("scenario_police");

    world.extraKeywords = [{ category: "scenario_police", stem: "томбол" }];
    const checkId = await startOn(PHONE_2);
    const after = await submitAnswers(
      depsFor(world, PHONE_2),
      actorFor(world, PHONE_2),
      checkId,
      answers(TEXT_ONLY),
    );

    const reason = after.verdict.reasons.find((r) => r.code === "scenario_police");
    expect(reason?.evidence).toEqual(["томбола"]);
    expect(after.verdict.scriptType).toBe("police");
    expect(after.verdict.score).toBeGreaterThan(before.verdict.score);
    expect(world.saved.at(-1)?.fields.reason_codes).toContain("scenario_police");
  });

  it("a failure to load the keywords never blocks a check (none are used)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    world.failKeywords = true;
    const checkId = await startOn(PHONE_1);

    const result = await submitAnswers(
      depsFor(world, PHONE_1),
      actorFor(world, PHONE_1),
      checkId,
      answers(POLICE_AND_MONEY),
    );

    expect(result.verdict.level).toBe("red");
    expect(world.checks[0]?.status).toBe("answered");
  });

  it("returns the first contact WITH a phone for the „Обади се на …“ button", async () => {
    const checkId = await startOn(PHONE_1);
    const result = await submitAnswers(
      depsFor(world, PHONE_1),
      actorFor(world, PHONE_1),
      checkId,
      answers(POLICE_AND_MONEY),
    );
    // Анна (#1) has no phone yet, so the button calls Иван (#2).
    expect(result.callContact).toEqual({ displayName: "Иван", phone: "0888 111 222" });
  });

  it("removes personal data BEFORE the text reaches the repository", async () => {
    const checkId = await startOn(PHONE_1);
    const text =
      "Обади се полицай, каза че Иван е арестуван. Мария да преведе пари на BG80BNBG96611020345678, тел. 0888 123 456.";

    await submitAnswers(
      depsFor(world, PHONE_1),
      actorFor(world, PHONE_1),
      checkId,
      answers({ asksMoney: "yes", text }),
    );

    const stored = world.saved[0]?.fields.text_redacted ?? "";
    expect(stored).not.toContain("Иван");
    expect(stored).not.toContain("Мария");
    expect(stored).not.toContain("0888 123 456");
    expect(stored).not.toContain("BG80BNBG96611020345678");
    expect(stored).toContain("[ИМЕ]");
    expect(stored).toContain("[ТЕЛЕФОН]");
    expect(stored).toContain("[IBAN]");
  });

  it("a phone can't answer a check of another phone, even of the same person (404)", async () => {
    const checkId = await startOn(PHONE_1);
    const error = await errorOf(
      submitAnswers(depsFor(world, PHONE_2), actorFor(world, PHONE_2), checkId, answers({})),
    );
    expect(error).toMatchObject({ status: 404 });
    expect(world.saved).toHaveLength(0);
  });

  it("a phone of another person can't see the check at all (404)", async () => {
    const checkId = await startOn(PHONE_1);
    const error = await errorOf(
      submitAnswers(
        depsFor(world, OTHER_PHONE),
        actorFor(world, OTHER_PHONE),
        checkId,
        answers({}),
      ),
    );
    expect(error).toMatchObject({ status: 404 });
  });

  it("a family member can't send answers, even with access (403)", async () => {
    const checkId = await startOn(PHONE_1);
    const error = await errorOf(
      submitAnswers(depsFor(world, OWNER), actorFor(world, OWNER), checkId, answers({})),
    );
    expect(error).toMatchObject({ status: 403 });
  });

  it("answers only once: the second time is 409", async () => {
    const checkId = await startOn(PHONE_1);
    const deps = depsFor(world, PHONE_1);
    await submitAnswers(deps, actorFor(world, PHONE_1), checkId, answers(POLICE_AND_MONEY));

    const error = await errorOf(
      submitAnswers(deps, actorFor(world, PHONE_1), checkId, answers({ asksMoney: "no" })),
    );
    expect(error).toMatchObject({ status: 409, code: "already_answered" });
    expect(world.saved).toHaveLength(1);
    expect(world.checks[0]?.risk_level).toBe("red");
  });

  it("two answers at the same moment: the database UPDATE lets only one through (409)", async () => {
    const checkId = await startOn(PHONE_1);
    world.raceOnSave = true;
    const error = await errorOf(
      submitAnswers(depsFor(world, PHONE_1), actorFor(world, PHONE_1), checkId, answers({})),
    );
    expect(error).toMatchObject({ status: 409 });
    expect(world.verdictCalls).toHaveLength(0);
  });
});

// --- 3. GET /api/checks/:id -------------------------------------------------------

describe("getCheck", () => {
  async function answeredCheck(): Promise<string> {
    const { checkId } = await startCheck(depsFor(world, PHONE_1), actorFor(world, PHONE_1));
    await submitAnswers(
      depsFor(world, PHONE_1),
      actorFor(world, PHONE_1),
      checkId,
      answers(POLICE_AND_MONEY),
    );
    return checkId;
  }

  it("shows the family member with access the stored verdict with Bulgarian reasons", async () => {
    const checkId = await answeredCheck();
    const check = await getCheck(depsFor(world, CONTACT), actorFor(world, CONTACT), checkId);

    expect(check.status).toBe("answered");
    expect(check.verdict?.level).toBe("red");
    expect(check.verdict?.hardRules).toContain("HR1_POLICE_ASKS_MONEY");
    expect(check.verdict?.reasons).toContainEqual({
      code: "HR1_POLICE_ASKS_MONEY",
      textBg: bg.engine.hardRules.HR1_POLICE_ASKS_MONEY.explanation,
    });
    expect(check.answers.claimedIdentity).toBe("police");
    expect(check.acknowledgement).toBeNull();
  });

  it("answers 404 to a family member without access", async () => {
    const checkId = await answeredCheck();
    const error = await errorOf(
      getCheck(depsFor(world, STRANGER), actorFor(world, STRANGER), checkId),
    );
    expect(error).toMatchObject({ status: 404 });
  });

  it("answers 404 to another phone of the same person", async () => {
    const checkId = await answeredCheck();
    const error = await errorOf(
      getCheck(depsFor(world, PHONE_2), actorFor(world, PHONE_2), checkId),
    );
    expect(error).toMatchObject({ status: 404 });
  });

  it("a started check has no verdict yet", async () => {
    const { checkId } = await startCheck(depsFor(world, PHONE_1), actorFor(world, PHONE_1));
    const check = await getCheck(depsFor(world, PHONE_1), actorFor(world, PHONE_1), checkId);
    expect(check.status).toBe("started");
    expect(check.verdict).toBeNull();
  });

  it("only suggests an emergency call after the chain is exhausted and nobody has answered", async () => {
    const row = startedRow(world, PERSON, actorFor(world, PHONE_1).device?.id ?? null);
    row.escalation_due_at = world.now.toISOString();
    world.checks.push(row);
    const phone = actorFor(world, PHONE_1);
    const deps = depsFor(world, PHONE_1);
    expect((await getCheck(deps, phone, row.id)).suggestEmergencyCall).toBeUndefined();

    row.escalation_due_at = null;
    row.escalation_exhausted_at = world.now.toISOString();
    expect((await getCheck(deps, phone, row.id)).suggestEmergencyCall).toBe(true);

    await acknowledge(depsFor(world, OWNER), actorFor(world, OWNER), row.id);
    expect((await getCheck(deps, phone, row.id)).suggestEmergencyCall).toBeUndefined();
  });
});

// --- 4. GET /api/checks?personId=… -------------------------------------------------

describe("listChecks", () => {
  it("keeps checks in history but marks them invisible in alerts until the caller is notified", async () => {
    const row = startedRow(world, PERSON, null);
    row.escalation_due_at = world.now.toISOString();
    world.checks.push(row);
    const deps = depsFor(world, CONTACT);
    const query = { personId: PERSON };

    expect((await listChecks(deps, query)).checks[0]).toMatchObject({
      id: row.id,
      alertVisible: false,
    });
    deps.listAlertedChecksForCaller = async () => [row.id];
    expect((await listChecks(deps, query)).checks[0]?.alertVisible).toBeUndefined();
  });

  it("lists the person's checks newest first, 20 per page, with a cursor", async () => {
    for (let i = 0; i < CHECKS_PAGE_SIZE + 2; i++) {
      // A new minute for every check, so the order is clear.
      world.now = new Date(Date.UTC(2026, 10, 9, 10, i));
      const row = startedRow(world, PERSON, "device-1");
      world.checks.push(row);
    }
    world.checks.push(startedRow(world, OTHER_PERSON, "device-petar"));

    const page1 = await listChecks(depsFor(world, OWNER), { personId: PERSON });
    expect(page1.checks).toHaveLength(CHECKS_PAGE_SIZE);
    expect(page1.checks[0]?.startedAt).toBe("2026-11-09T10:21:00.000Z");
    expect(page1.checks.every((c) => c.protectedPersonId === PERSON)).toBe(true);
    expect(page1.nextCursor).toBe("2026-11-09T10:02:00.000Z");

    const page2 = await listChecks(depsFor(world, OWNER), {
      personId: PERSON,
      cursor: page1.nextCursor ?? undefined,
    });
    expect(page2.checks.map((c) => c.startedAt)).toEqual([
      "2026-11-09T10:01:00.000Z",
      "2026-11-09T10:00:00.000Z",
    ]);
    expect(page2.nextCursor).toBeNull();
  });

  it("answers 404 for a person the caller has no access to", async () => {
    const error = await errorOf(listChecks(depsFor(world, STRANGER), { personId: PERSON }));
    expect(error).toMatchObject({ status: 404 });
  });
});

// --- 5. POST /api/checks/:id/acknowledge ---------------------------------------------

describe("acknowledge", () => {
  async function newCheck(): Promise<string> {
    return (await startCheck(depsFor(world, PHONE_1), actorFor(world, PHONE_1))).checkId;
  }

  it("the first family member wins; the second learns who it was", async () => {
    const checkId = await newCheck();

    const first = await acknowledge(depsFor(world, CONTACT), actorFor(world, CONTACT), checkId);
    expect(first.first).toBe(true);
    expect(first.acknowledgement.displayName).toBe("Иван");
    expect(first.acknowledgement.messageBg).toBe("Иван ще ви се обади веднага.");

    world.now = new Date("2026-11-09T10:00:30Z");
    const second = await acknowledge(depsFor(world, OWNER), actorFor(world, OWNER), checkId);
    expect(second.first).toBe(false);
    expect(second.acknowledgement.displayName).toBe("Иван");

    // The check still names Иван, with the time of the FIRST press.
    expect(world.checks[0]?.acknowledged_by).toBe(CONTACT);
    expect(world.checks[0]?.acknowledged_at).toBe("2026-11-09T10:00:00.000Z");
    // Only the winner is written to the audit log.
    expect(world.audit).toEqual([
      {
        actorId: CONTACT,
        action: "check_acknowledged",
        targetType: "check",
        targetId: checkId,
        details: { protected_person_id: PERSON },
      },
    ]);
  });

  it("pressing twice is still 'first' for the same family member", async () => {
    const checkId = await newCheck();
    await acknowledge(depsFor(world, OWNER), actorFor(world, OWNER), checkId);
    const again = await acknowledge(depsFor(world, OWNER), actorFor(world, OWNER), checkId);
    expect(again.first).toBe(true);
    expect(world.audit).toHaveLength(1);
  });

  it("answers 404 to a family member without access and changes nothing", async () => {
    const checkId = await newCheck();
    const error = await errorOf(
      acknowledge(depsFor(world, STRANGER), actorFor(world, STRANGER), checkId),
    );
    expect(error).toMatchObject({ status: 404 });
    expect(world.checks[0]?.acknowledged_by).toBeNull();
    expect(world.audit).toHaveLength(0);
  });

  it("the phone then reads „Анна ще ви се обади веднага.“", async () => {
    const checkId = await newCheck();
    await acknowledge(depsFor(world, OWNER), actorFor(world, OWNER), checkId);

    const check = await getCheck(depsFor(world, PHONE_1), actorFor(world, PHONE_1), checkId);
    expect(check.acknowledgement).toEqual({
      at: "2026-11-09T10:00:00.000Z",
      displayName: "Анна",
      messageBg: "Анна ще ви се обади веднага.",
    });
  });

  it("uses the general text when the family member is no longer in the contact list", async () => {
    const checkId = await newCheck();
    await acknowledge(depsFor(world, CONTACT), actorFor(world, CONTACT), checkId);
    world.contacts.set(
      PERSON,
      (world.contacts.get(PERSON) ?? []).filter((c) => c.user_id !== CONTACT),
    );

    const check = await getCheck(depsFor(world, PHONE_1), actorFor(world, PHONE_1), checkId);
    expect(check.acknowledgement?.displayName).toBeNull();
    expect(check.acknowledgement?.messageBg).toBe(bg.checks.acknowledgedBySomeone);
  });
});

describe("acknowledgementMessage", () => {
  it("puts the name into the bg.ts text", () => {
    expect(acknowledgementMessage("Иван")).toBe("Иван ще ви се обади веднага.");
    expect(acknowledgementMessage(null)).toBe(bg.checks.acknowledgedBySomeone);
  });
});
