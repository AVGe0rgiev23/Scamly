// The call check („Проверка на обаждане“, BUILD_PLAN 3 #17–#22, tasks W2-02 and W2-04).
//
//   startCheck()      POST /api/checks                   the phone's big button
//   submitAnswers()   PUT  /api/checks/:id/answers       answers -> verdict (server)
//   getCheck()        GET  /api/checks/:id               one check (family or its phone)
//   listChecks()      GET  /api/checks?personId=…        history (family)
//   acknowledge()     POST /api/checks/:id/acknowledge   „Обаждам ѝ се сега“ (family)
//
// The two locks (BUILD_PLAN section 0):
//   1. Every check is first loaded with the caller's USER client, so RLS proves the
//      caller may see it (the person's own phone, or a family member with access).
//      Then this file adds the stricter rules in code: a phone may only touch the
//      checks it started itself; answers only once.
//   2. Only after that, the writes use the ADMIN client (BUILD_PLAN 2.4, uses 3 and
//      4b): there is no INSERT/UPDATE policy on checks, so a phone can never store a
//      verdict it made up. The verdict is always computed here, on the server.
//
// Like pairingService.ts, the service gets the outside world in one `deps` object, so
// the tests can pass in-memory fakes (dependency injection).

import "server-only";
import { getFeatures } from "@/config/features";
import {
  analyseCall,
  HARD_RULE_IDS,
  MAX_TEXT_LENGTH,
  redactPersonalData,
  SIGNAL_CATEGORIES,
  type ExtraKeyword,
  type HardRuleId,
  type Reason,
} from "@/engine";
import { bg } from "@/i18n/bg";
import type {
  AcknowledgeResultDto,
  AcknowledgementDto,
  AnswersInput,
  AnswersResultDto,
  CallContactDto,
  CheckDto,
  ListChecksQuery,
  VerdictDto,
} from "@/schemas/checks";
import type { Actor } from "@/server/auth/actor";
import { conflict, forbidden, notFound } from "@/server/http/errors";
import { listAlertedCheckIds } from "@/server/repositories/alertsRepository";
import { writeAudit, type AuditEntry } from "@/server/repositories/auditRepository";
import {
  acknowledgeCheck,
  findCheckById,
  insertCheck,
  listChecksOfPerson,
  saveCheckAnswers,
  type CheckAnswersUpdate,
  type CheckRow,
} from "@/server/repositories/checksRepository";
import { listContacts } from "@/server/repositories/contactsRepository";
import { findPersonById } from "@/server/repositories/personsRepository";
import {
  databaseHitCounter,
  enforceRateLimit,
  RATE_LIMITS,
  type HitCounter,
} from "@/server/security/rateLimit";
import {
  createAlertDeps,
  escalateAlerts,
  fanOut,
  getEscalationSecret,
  notifyVerdict,
  usesEscalation,
  type ContactRef,
} from "@/server/services/alertService";
import { loadModeratorKeywords } from "@/server/services/moderatorKeywords";
import type { DbClient } from "@/server/supabase/userClient";

// How many checks one page of GET /api/checks has.
export const CHECKS_PAGE_SIZE = 20;

// Everything the check service needs from the outside world.
// "ForCaller" = with the USER client, so RLS decides what the caller may see.
export type CheckDeps = {
  now: () => Date;
  hitCounter: HitCounter;
  findCheckForCaller: (checkId: string) => Promise<CheckRow | null>;
  listChecksForCaller: (
    personId: string,
    before: string | null,
    limit: number,
  ) => Promise<CheckRow[]>;
  findPersonForCaller: (personId: string) => Promise<{ id: string; display_name: string } | null>;
  listContactsForCaller: (personId: string) => Promise<ContactRef[]>;
  listAlertedChecksForCaller: (checkIds: string[]) => Promise<string[]>;
  // Writes with the service role (only after the checks above).
  insertCheck: (check: { protectedPersonId: string; deviceId: string }) => Promise<string>;
  saveAnswers: (checkId: string, fields: CheckAnswersUpdate) => Promise<"saved" | "not_started">;
  markAcknowledged: (
    checkId: string,
    userId: string,
    at: Date,
  ) => Promise<"acknowledged" | "already">;
  writeAudit: (entry: AuditEntry) => Promise<void>;
  // The moderators' extra keywords of the published scam cards (W3-05, cached 60 s).
  loadExtraKeywords: () => Promise<ExtraKeyword[]>;
  // The alert service (alertService.ts).
  fanOutAlerts: (checkId: string) => Promise<void>;
  notifyVerdict: (checkId: string) => Promise<void>;
};

// ---------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------

// The paired phone of the caller. Every phone route calls requireRole(["protected"])
// first, and getActor() always fills `device` for that role; this is a safety net.
function deviceOf(actor: Actor): { id: string; protectedPersonId: string } {
  if (actor.role !== "protected" || actor.device === null) {
    throw forbidden();
  }
  return actor.device;
}

// Loads a check that THIS phone started. Anything else (another person's check, or a
// check of the same person started on another phone) answers 404, like a wrong id.
async function loadOwnCheck(deps: CheckDeps, actor: Actor, checkId: string): Promise<CheckRow> {
  const device = deviceOf(actor);
  const check = await deps.findCheckForCaller(checkId);
  if (check === null || check.device_id !== device.id) {
    throw notFound();
  }
  return check;
}

// Logs an alert problem without failing the request: the older person must ALWAYS
// get to the questions and the verdict, even if an alert could not be written.
// (The family page also sees the check itself through Realtime.)
async function runAlertStep(name: string, step: () => Promise<void>): Promise<void> {
  try {
    await step();
  } catch (error) {
    const description = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error(`[checks] ${name} failed:`, description);
  }
}

// The moderators' keywords, or none if they can't be loaded: a check must never fail
// or wait because of the script library (the engine then uses its own dictionary).
async function extraKeywordsFor(deps: CheckDeps): Promise<ExtraKeyword[]> {
  try {
    return await deps.loadExtraKeywords();
  } catch (error) {
    const description = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error("[checks] moderator keywords unavailable:", description);
    return [];
  }
}

// A stored code (checks.reason_codes) back to its Bulgarian "why" line.
// Unknown codes (e.g. from a newer engine version) are skipped.
function reasonFromCode(code: string): Reason | null {
  for (const id of HARD_RULE_IDS) {
    if (id === code) {
      return { code: id, textBg: bg.engine.hardRules[id].explanation };
    }
  }
  for (const category of SIGNAL_CATEGORIES) {
    if (category === code) {
      return { code: category, textBg: bg.engine.reasons[category] };
    }
  }
  return null;
}

// Only the strings that really are hard-rule ids (checks.hard_rules is text[]).
function hardRulesFrom(codes: string[]): HardRuleId[] {
  const result: HardRuleId[] = [];
  for (const code of codes) {
    for (const id of HARD_RULE_IDS) {
      if (id === code) {
        result.push(id);
      }
    }
  }
  return result;
}

// The verdict stored in a check row, or null while it is only "started".
function verdictFromRow(row: CheckRow): VerdictDto | null {
  if (row.status !== "answered" || row.risk_level === null || row.score === null) {
    return null;
  }
  const reasons: Reason[] = [];
  for (const code of row.reason_codes) {
    const reason = reasonFromCode(code);
    if (reason !== null) {
      reasons.push(reason);
    }
  }
  return {
    level: row.risk_level,
    score: row.score,
    scriptType: row.script_type ?? "unknown",
    hardRules: hardRulesFrom(row.hard_rules),
    reasons,
    headlineBg: bg.verdict[row.risk_level].title,
    adviceBg: bg.verdict[row.risk_level].description,
  };
}

// „Иван ще ви се обади веднага.“ (or the text without a name).
export function acknowledgementMessage(displayName: string | null): string {
  if (displayName === null) {
    return bg.checks.acknowledgedBySomeone;
  }
  return bg.checks.acknowledgedBy.replace("{name}", displayName);
}

// The name the older person knows for a family member: their name in the contact
// list (e.g. „Иван“). null when they are no longer in the list.
function contactNameOf(contacts: ContactRef[], userId: string): string | null {
  const contact = contacts.find((c) => c.user_id === userId);
  return contact === undefined ? null : contact.display_name;
}

function acknowledgementFromRow(row: CheckRow, contacts: ContactRef[]): AcknowledgementDto | null {
  if (row.acknowledged_by === null || row.acknowledged_at === null) {
    return null;
  }
  const displayName = contactNameOf(contacts, row.acknowledged_by);
  return {
    at: row.acknowledged_at,
    displayName,
    messageBg: acknowledgementMessage(displayName),
  };
}

// A check row -> what the API sends back (camelCase, Bulgarian reasons, names).
function toCheckDto(row: CheckRow, contacts: ContactRef[], alertVisible = true): CheckDto {
  return {
    id: row.id,
    protectedPersonId: row.protected_person_id,
    status: row.status,
    startedAt: row.started_at,
    answeredAt: row.answered_at,
    answers: {
      claimedIdentity: row.claimed_identity,
      asksMoney: row.asks_money,
      handover: row.handover,
      rushing: row.rushing,
      secrecy: row.secrecy,
      textRedacted: row.text_redacted,
    },
    verdict: verdictFromRow(row),
    acknowledgement: acknowledgementFromRow(row, contacts),
    ...(alertVisible ? {} : { alertVisible: false }),
    ...(row.escalation_exhausted_at && row.acknowledged_at === null
      ? { suggestEmergencyCall: true }
      : {}),
  };
}

// The first contact in calling order who has a phone number, for the tel: button.
// (Contact #1 is often the owner, who may not have entered a phone yet.)
export function firstCallContact(contacts: ContactRef[]): CallContactDto | null {
  for (const contact of contacts) {
    if (contact.phone !== null) {
      return { displayName: contact.display_name, phone: contact.phone };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------------
// 1. POST /api/checks (phone): the big button
// ---------------------------------------------------------------------------------
export async function startCheck(deps: CheckDeps, actor: Actor): Promise<{ checkId: string }> {
  const device = deviceOf(actor);

  // At most 10 checks per phone per hour, so a broken or hacked phone can't flood the
  // family with alerts. The device id is not personal data, so no HMAC is needed.
  const rule = RATE_LIMITS.checkPerDevice;
  await enforceRateLimit(deps.hitCounter, rule, `${rule.name}:${device.id}`);

  // The person always comes from the phone's own pairing, never from the request.
  const checkId = await deps.insertCheck({
    protectedPersonId: device.protectedPersonId,
    deviceId: device.id,
  });

  // Alert the family immediately, before the questions (brief 5.2 B).
  await runAlertStep("alert fan-out", () => deps.fanOutAlerts(checkId));

  return { checkId };
}

// ---------------------------------------------------------------------------------
// 2. PUT /api/checks/:id/answers (phone, own check, only once)
// ---------------------------------------------------------------------------------
export async function submitAnswers(
  deps: CheckDeps,
  actor: Actor,
  checkId: string,
  answers: AnswersInput,
): Promise<AnswersResultDto> {
  const check = await loadOwnCheck(deps, actor, checkId);
  if (check.status !== "started") {
    throw conflict("already_answered", bg.checks.alreadyAnswered);
  }

  // The names we know (the person and their contacts) are removed from the text.
  const personId = check.protected_person_id;
  const person = await deps.findPersonForCaller(personId);
  const contacts = await deps.listContactsForCaller(personId);
  const knownNames = contacts.map((contact) => contact.display_name);
  if (person !== null) {
    knownNames.push(person.display_name);
  }

  // The engine reads the ORIGINAL text, like the phone's offline fallback (BUILD_PLAN
  // 4.9). That text stays in memory. The server also adds the moderators' keywords of
  // the published scam cards (W3-05); they can only add evidence to an existing
  // scenario category, so the offline verdict can only be the same or lower.
  const extraKeywords = await extraKeywordsFor(deps);
  const verdict = analyseCall({
    claimedIdentity: answers.claimedIdentity,
    asksMoney: answers.asksMoney,
    handover: answers.handover,
    rushing: answers.rushing,
    secrecy: answers.secrecy,
    text: answers.text,
    extraKeywords,
  });

  // Only the REDACTED text is ever stored (BUILD_PLAN 2.3, 4.8). A label can be longer
  // than the name it replaces („Ив“ -> „[ИМЕ]“), so cut it to the column's limit.
  const textRedacted =
    answers.text === ""
      ? null
      : redactPersonalData(answers.text, knownNames).slice(0, MAX_TEXT_LENGTH);

  const saved = await deps.saveAnswers(checkId, {
    claimed_identity: answers.claimedIdentity,
    asks_money: answers.asksMoney,
    handover: answers.handover,
    rushing: answers.rushing,
    secrecy: answers.secrecy,
    text_redacted: textRedacted,
    score: verdict.score,
    risk_level: verdict.level,
    script_type: verdict.scriptType,
    hard_rules: verdict.hardRules,
    reason_codes: verdict.reasons.map((reason) => reason.code),
    engine_version: verdict.engineVersion,
    answered_at: deps.now().toISOString(),
  });
  if (saved === "not_started") {
    // Another request answered this check a moment earlier.
    throw conflict("already_answered", bg.checks.alreadyAnswered);
  }

  await runAlertStep("verdict notification", () => deps.notifyVerdict(checkId));

  return {
    checkId,
    verdict: {
      level: verdict.level,
      score: verdict.score,
      scriptType: verdict.scriptType,
      hardRules: verdict.hardRules,
      reasons: verdict.reasons,
      headlineBg: verdict.headlineBg,
      adviceBg: verdict.adviceBg,
    },
    callContact: firstCallContact(contacts),
  };
}

// ---------------------------------------------------------------------------------
// 3. GET /api/checks/:id (family with access, or the phone that started it)
// ---------------------------------------------------------------------------------
export async function getCheck(deps: CheckDeps, actor: Actor, checkId: string): Promise<CheckDto> {
  const check =
    actor.role === "protected"
      ? await loadOwnCheck(deps, actor, checkId)
      : await deps.findCheckForCaller(checkId); // RLS: family with access only
  if (check === null) {
    throw notFound();
  }
  // The contact list gives the acknowledger's name („Иван ще ви се обади веднага“).
  const contacts =
    check.acknowledged_by === null
      ? []
      : await deps.listContactsForCaller(check.protected_person_id);
  const alertVisible =
    actor.role !== "family" ||
    !usesEscalation(check) ||
    (await deps.listAlertedChecksForCaller([checkId])).includes(checkId);
  return toCheckDto(check, contacts, alertVisible);
}

// ---------------------------------------------------------------------------------
// 4. GET /api/checks?personId=…&cursor=… (family with access)
// ---------------------------------------------------------------------------------
export async function listChecks(
  deps: CheckDeps,
  query: ListChecksQuery,
): Promise<{ checks: CheckDto[]; nextCursor: string | null }> {
  // RLS: null when the caller has no access to this person -> 404.
  const person = await deps.findPersonForCaller(query.personId);
  if (person === null) {
    throw notFound();
  }
  const rows = await deps.listChecksForCaller(
    query.personId,
    query.cursor ?? null,
    CHECKS_PAGE_SIZE,
  );
  const contacts = await deps.listContactsForCaller(query.personId);
  const escalatingIds = rows.filter(usesEscalation).map((row) => row.id);
  const alerted = await deps.listAlertedChecksForCaller(escalatingIds);
  const checks = rows.map((row) =>
    toCheckDto(row, contacts, !usesEscalation(row) || alerted.includes(row.id)),
  );
  // A full page means there may be more: the next page starts before the last one.
  const last = rows[rows.length - 1];
  const nextCursor =
    rows.length === CHECKS_PAGE_SIZE && last !== undefined ? last.started_at : null;
  return { checks, nextCursor };
}

// ---------------------------------------------------------------------------------
// 5. POST /api/checks/:id/acknowledge (family with access): „Обаждам ѝ се сега“
// ---------------------------------------------------------------------------------
export async function acknowledge(
  deps: CheckDeps,
  actor: Actor,
  checkId: string,
): Promise<AcknowledgeResultDto> {
  // Lock 1: the user client must see the check (RLS: family with access).
  const check = await deps.findCheckForCaller(checkId);
  if (check === null) {
    throw notFound();
  }
  const contacts = await deps.listContactsForCaller(check.protected_person_id);

  // Lock 2 passed: write with the service role, only if nobody acknowledged before.
  const now = deps.now();
  const result = await deps.markAcknowledged(checkId, actor.userId, now);

  if (result === "acknowledged") {
    await deps.writeAudit({
      actorId: actor.userId,
      action: "check_acknowledged",
      targetType: "check",
      targetId: checkId,
      details: { protected_person_id: check.protected_person_id },
    });
    const displayName = contactNameOf(contacts, actor.userId) ?? actor.profile.display_name;
    return {
      checkId,
      first: true,
      acknowledgement: {
        at: now.toISOString(),
        displayName,
        messageBg: acknowledgementMessage(displayName),
      },
    };
  }

  // Somebody was faster (or this caller pressed twice): read who it was.
  const current = await deps.findCheckForCaller(checkId);
  const acknowledgement = current === null ? null : acknowledgementFromRow(current, contacts);
  if (current === null || acknowledgement === null) {
    throw notFound();
  }
  return { checkId, first: current.acknowledged_by === actor.userId, acknowledgement };
}

// ---------------------------------------------------------------------------------
// The real deps. `user` = the caller's own client (RLS applies), `admin` = the
// service-role client (BUILD_PLAN 2.4, uses 3, 4, 4b and 7).
// ---------------------------------------------------------------------------------
export function createCheckDeps(user: DbClient, admin: DbClient): CheckDeps {
  const alertDeps = createAlertDeps(admin);
  const escalationEnabled = getFeatures().escalation && getEscalationSecret() !== undefined;
  return {
    now: () => new Date(),
    hitCounter: databaseHitCounter(admin),
    findCheckForCaller: (checkId) => findCheckById(user, checkId),
    listChecksForCaller: (personId, before, limit) =>
      listChecksOfPerson(user, personId, before, limit),
    findPersonForCaller: (personId) => findPersonById(user, personId),
    listContactsForCaller: (personId) => listContacts(user, personId),
    listAlertedChecksForCaller: (checkIds) => listAlertedCheckIds(user, checkIds),
    insertCheck: (check) =>
      insertCheck(
        admin,
        // The first contact is due immediately, even if the two servers' clocks differ.
        escalationEnabled ? { ...check, escalationDueAt: new Date(0).toISOString() } : check,
      ),
    saveAnswers: (checkId, fields) => saveCheckAnswers(admin, checkId, fields),
    markAcknowledged: (checkId, userId, at) => acknowledgeCheck(admin, checkId, userId, at),
    writeAudit: (entry) => writeAudit(admin, entry),
    loadExtraKeywords: loadModeratorKeywords,
    fanOutAlerts: async (checkId) => {
      if (escalationEnabled) {
        await escalateAlerts(admin, checkId);
      } else {
        await fanOut(alertDeps, checkId);
      }
    },
    notifyVerdict: (checkId) => notifyVerdict(alertDeps, checkId),
  };
}
