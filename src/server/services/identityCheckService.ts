// „Провери истинския“ (D34, task P-05, BUILD_PLAN 5b): the protected phone asks the
// REAL family member "the caller says they are you, is it you?".
//
//   listFamilyForPhone()   GET   /api/identity-checks/family  the tiles („Казва, че е Иван“)
//   askFamilyMember()      POST  /api/identity-checks         the phone asks one member
//   getIdentityCheck()     GET   /api/identity-checks/:id     the phone / the family
//   listMyIdentityChecks() GET   /api/identity-checks         a family member's list
//   answerIdentityCheck()  PATCH /api/identity-checks/:id     „Не съм аз“ / „Аз съм“
//
// The chain (45 s without an answer -> the next family member) is driven by the
// PHONE: it simply asks the next person with another POST. The database then marks
// the previous pending question 'expired' (one open question per phone), so a late
// answer to the old question is refused with 409. No server job, no timer here.
//
// The two locks (BUILD_PLAN section 0):
//   1. this file checks the rules in code (the phone's own person, a family member
//      with an account, only the claimed member answers, once, within 15 minutes);
//   2. the reads and writes use the caller's USER client, so RLS and the column
//      privileges check the same rules again in the database.
// Only the audit row and the push messages use the service role (other users' data).
//
// Like checkService.ts, the outside world comes in one `deps` object, so the tests
// can pass in-memory fakes (dependency injection).

import "server-only";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import type {
  CreateIdentityCheckInput,
  IdentityAnswer,
  IdentityCheckDto,
  IdentityCheckStatus,
  IdentityFamilyDto,
  IdentityPersonDto,
  MyIdentityChecksDto,
} from "@/schemas/identityChecks";
import type { Actor } from "@/server/auth/actor";
import { badRequest, conflict, forbidden, notFound } from "@/server/http/errors";
import type { PushMessage } from "@/server/notifications/pushSender";
import { writeAudit, type AuditEntry } from "@/server/repositories/auditRepository";
import { listContacts } from "@/server/repositories/contactsRepository";
import {
  answerIdentityCheck as answerQuery,
  findIdentityCheckById,
  insertIdentityCheck,
  listRecentIdentityChecks,
  type IdentityCheckRow,
} from "@/server/repositories/identityChecksRepository";
import { findPersonById } from "@/server/repositories/personsRepository";
import {
  databaseHitCounter,
  enforceRateLimit,
  RATE_LIMITS,
  type HitCounter,
} from "@/server/security/rateLimit";
import { createRealPushDeps, sendPushToUser } from "@/server/notifications/pushChannel";
import type { ContactRef } from "@/server/services/alertService";
import type { DbClient } from "@/server/supabase/userClient";

// A question can be answered only in its first 15 minutes (also in the RLS policy).
export const ANSWER_WINDOW_MS = 15 * 60 * 1000;
// How far back a family member's list goes (the warnings stay useful for a day).
export const LIST_WINDOW_MS = 24 * 60 * 60 * 1000;
export const LIST_LIMIT = 50;

// Everything the service needs from the outside world.
// "ForCaller" = with the USER client, so RLS decides what the caller may see and do.
export type IdentityCheckDeps = {
  now: () => Date;
  hitCounter: HitCounter;
  findPersonForCaller: (personId: string) => Promise<{ id: string; display_name: string } | null>;
  listContactsForCaller: (personId: string) => Promise<ContactRef[]>;
  insertForCaller: (check: {
    protectedPersonId: string;
    deviceId: string;
    claimedUserId: string;
  }) => Promise<IdentityCheckRow | "refused" | "busy">;
  findForCaller: (checkId: string) => Promise<IdentityCheckRow | null>;
  listRecentForCaller: (since: string, limit: number) => Promise<IdentityCheckRow[]>;
  answerForCaller: (check: {
    id: string;
    userId: string;
    answer: IdentityAnswer;
    notBefore: string;
  }) => Promise<IdentityCheckRow | null>;
  // Service role: the audit log, and push messages to other users' browsers.
  writeAudit: (entry: AuditEntry) => Promise<void>;
  sendPush: (userId: string, message: PushMessage) => Promise<void>;
};

// ---------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------

// The paired phone of the caller (requireRole(["protected"]) runs first; safety net).
function deviceOf(actor: Actor): { id: string; protectedPersonId: string } {
  if (actor.role !== "protected" || actor.device === null) {
    throw forbidden();
  }
  return actor.device;
}

// Puts values into a text from bg.ts: fillText("Здравей, {name}", { name: "Иван" }).
function fillText(template: string, values: { [key: string]: string }): string {
  let text = template;
  for (const [key, value] of Object.entries(values)) {
    text = text.replaceAll(`{${key}}`, value);
  }
  return text;
}

// „ИП“ for „Иван Петров“, „И“ for „Иван“ (at most two letters, upper case).
export function initialsOf(displayName: string): string {
  const words = displayName
    .trim()
    .split(/\s+/)
    .filter((word) => word !== "");
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toLocaleUpperCase("bg"))
    .join("");
}

// The status the screens should show: "pending" after 15 minutes counts as "expired".
export function effectiveStatus(row: IdentityCheckRow, now: Date): IdentityCheckStatus {
  if (row.status === "pending" && now.getTime() - Date.parse(row.created_at) >= ANSWER_WINDOW_MS) {
    return "expired";
  }
  return row.status;
}

// A row -> what the API sends back.
function toDto(
  row: IdentityCheckRow,
  now: Date,
  personName: string | null,
  contacts: ContactRef[],
): IdentityCheckDto {
  const contact = contacts.find((c) => c.user_id === row.claimed_user_id);
  const created = Date.parse(row.created_at);
  return {
    id: row.id,
    protectedPersonId: row.protected_person_id,
    personName,
    claimedUserId: row.claimed_user_id,
    claimedName: contact === undefined ? null : contact.display_name,
    claimedPhone: contact === undefined ? null : contact.phone,
    status: effectiveStatus(row, now),
    createdAt: row.created_at,
    answeredAt: row.answered_at,
    answerableUntil: new Date(created + ANSWER_WINDOW_MS).toISOString(),
    secondsToAnswer:
      row.answered_at === null
        ? null
        : Math.max(0, Math.round((Date.parse(row.answered_at) - created) / 1000)),
  };
}

// Loads the person's name and contact list once, for building DTOs.
async function personContext(
  deps: IdentityCheckDeps,
  personId: string,
): Promise<{ personName: string | null; contacts: ContactRef[] }> {
  const person = await deps.findPersonForCaller(personId);
  const contacts = await deps.listContactsForCaller(personId);
  return { personName: person === null ? null : person.display_name, contacts };
}

// A push must never fail the request: the answer is already stored, and the
// family's open pages get it through Realtime anyway. We only log the problem.
async function pushQuietly(
  deps: IdentityCheckDeps,
  userId: string,
  message: PushMessage,
): Promise<void> {
  try {
    await deps.sendPush(userId, message);
  } catch (error) {
    const description = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error("[identity-checks] push failed:", description);
  }
}

// The push to the family member the caller pretends to be.
export function askMessage(checkId: string, personName: string | null): PushMessage {
  const person =
    personName === null || personName.trim() === "" ? bg.identityChecks.someone : personName.trim();
  return {
    title: bg.identityChecks.askTitle,
    body: fillText(bg.identityChecks.askBody, { person }),
    url: `${ROUTES.familyIdentity}?id=${encodeURIComponent(checkId)}`,
    tag: `identity-${checkId}`,
  };
}

// The push to the rest of the family after „Не съм аз“ (#38).
export function warnMessage(checkId: string, claimedName: string | null): PushMessage {
  const name =
    claimedName === null || claimedName.trim() === ""
      ? bg.identityChecks.someone
      : claimedName.trim();
  return {
    title: fillText(bg.identityChecks.warnTitle, { name }),
    body: fillText(bg.identityChecks.warnBody, { name }),
    url: ROUTES.familyAlerts,
    tag: `identity-warning-${checkId}`,
  };
}

// ---------------------------------------------------------------------------------
// 1. GET /api/identity-checks/family (phone): who can she pick?
// ---------------------------------------------------------------------------------
export async function listFamilyForPhone(
  deps: IdentityCheckDeps,
  actor: Actor,
): Promise<IdentityFamilyDto> {
  const device = deviceOf(actor);
  // RLS: a phone reads the contact list of its own person only.
  const contacts = await deps.listContactsForCaller(device.protectedPersonId);
  const people: IdentityPersonDto[] = contacts.map((contact) => ({
    userId: contact.user_id,
    displayName: contact.display_name,
    initials: initialsOf(contact.display_name),
    phone: contact.phone,
    priority: contact.priority,
    canReceive: contact.user_id !== null,
  }));
  return { people };
}

// ---------------------------------------------------------------------------------
// 2. POST /api/identity-checks (phone): "the caller says they are X"
// ---------------------------------------------------------------------------------
export async function askFamilyMember(
  deps: IdentityCheckDeps,
  actor: Actor,
  input: CreateIdentityCheckInput,
): Promise<IdentityCheckDto> {
  const device = deviceOf(actor);

  // At most 20 questions per phone per hour (no push spam to the family).
  const rule = RATE_LIMITS.identityPerDevice;
  await enforceRateLimit(deps.hitCounter, rule, `${rule.name}:${device.id}`);

  // X must be in THIS person's contact list with a Scamly account. The person always
  // comes from the phone's own pairing, never from the request.
  const personId = device.protectedPersonId;
  const { personName, contacts } = await personContext(deps, personId);
  const claimed = contacts.find((c) => c.user_id !== null && c.user_id === input.claimedUserId);
  if (claimed === undefined) {
    throw badRequest("not_family", bg.identityChecks.notFamily);
  }

  // Lock 2: RLS checks the same again (and that X is a 'family' account).
  const row = await deps.insertForCaller({
    protectedPersonId: personId,
    deviceId: device.id,
    claimedUserId: input.claimedUserId,
  });
  if (row === "refused") {
    throw badRequest("not_family", bg.identityChecks.notFamily);
  }
  if (row === "busy") {
    throw conflict("identity_busy", bg.identityChecks.busy);
  }

  // The live alert is the new row itself (Realtime); the push wakes the phone.
  await pushQuietly(deps, input.claimedUserId, askMessage(row.id, personName));

  return toDto(row, deps.now(), personName, contacts);
}

// ---------------------------------------------------------------------------------
// 3. GET /api/identity-checks/:id (the phone that asked, or the family)
// ---------------------------------------------------------------------------------
export async function getIdentityCheck(
  deps: IdentityCheckDeps,
  actor: Actor,
  checkId: string,
): Promise<IdentityCheckDto> {
  const row = await deps.findForCaller(checkId); // RLS: own phone or family only
  if (row === null) {
    throw notFound();
  }
  // A phone sees only the questions it asked itself (RLS says the same).
  if (actor.role === "protected" && row.device_id !== deviceOf(actor).id) {
    throw notFound();
  }
  const { personName, contacts } = await personContext(deps, row.protected_person_id);
  return toDto(row, deps.now(), personName, contacts);
}

// ---------------------------------------------------------------------------------
// 4. GET /api/identity-checks (family): my open questions + the circle's warnings
// ---------------------------------------------------------------------------------
export async function listMyIdentityChecks(
  deps: IdentityCheckDeps,
  actor: Actor,
): Promise<MyIdentityChecksDto> {
  const now = deps.now();
  const since = new Date(now.getTime() - LIST_WINDOW_MS).toISOString();
  // RLS: only questions about people this family member has access to.
  const rows = await deps.listRecentForCaller(since, LIST_LIMIT);

  // Names and contacts once per person (a Map is like a Python dict).
  const contexts = new Map<string, { personName: string | null; contacts: ContactRef[] }>();
  for (const row of rows) {
    if (!contexts.has(row.protected_person_id)) {
      contexts.set(row.protected_person_id, await personContext(deps, row.protected_person_id));
    }
  }

  const pending: IdentityCheckDto[] = [];
  const warnings: IdentityCheckDto[] = [];
  for (const row of rows) {
    const context = contexts.get(row.protected_person_id);
    if (context === undefined) {
      continue;
    }
    const dto = toDto(row, now, context.personName, context.contacts);
    if (row.claimed_user_id === actor.userId && dto.status === "pending") {
      pending.push(dto);
    } else if (row.claimed_user_id !== actor.userId && dto.status === "not_me") {
      warnings.push(dto);
    }
  }
  return { pending, warnings };
}

// ---------------------------------------------------------------------------------
// 5. PATCH /api/identity-checks/:id (the claimed family member): the answer
// ---------------------------------------------------------------------------------
export async function answerIdentityCheck(
  deps: IdentityCheckDeps,
  actor: Actor,
  checkId: string,
  answer: IdentityAnswer,
): Promise<IdentityCheckDto> {
  // Lock 1: RLS must show the question (family of the person), then only X answers.
  const row = await deps.findForCaller(checkId);
  if (row === null) {
    throw notFound();
  }
  if (row.claimed_user_id !== actor.userId) {
    throw forbidden();
  }
  const now = deps.now();
  if (effectiveStatus(row, now) !== "pending") {
    throw conflict("already_answered", bg.identityChecks.alreadyAnswered);
  }

  // Compare-and-set: only while still pending and younger than 15 minutes.
  const notBefore = new Date(now.getTime() - ANSWER_WINDOW_MS).toISOString();
  const updated = await deps.answerForCaller({
    id: checkId,
    userId: actor.userId,
    answer,
    notBefore,
  });
  if (updated === null) {
    // Answered in another tab a moment earlier, or the phone moved on (expired).
    throw conflict("already_answered", bg.identityChecks.alreadyAnswered);
  }

  const { personName, contacts } = await personContext(deps, updated.protected_person_id);
  const dto = toDto(updated, now, personName, contacts);

  if (answer === "not_me") {
    await deps.writeAudit({
      actorId: actor.userId,
      action: "identity_not_me",
      targetType: "identity_check",
      targetId: checkId,
      details: { protected_person_id: updated.protected_person_id },
    });
    // „Предупреди кръга“ (#38): everybody else in the family with an account. The
    // live warning is the UPDATE of the row (Realtime); the push reaches closed pages.
    const message = warnMessage(checkId, dto.claimedName);
    const others: string[] = [];
    for (const contact of contacts) {
      if (contact.user_id !== null && contact.user_id !== actor.userId) {
        others.push(contact.user_id);
      }
    }
    // All at the same time (Promise.all is like asyncio.gather in Python).
    await Promise.all(others.map((userId) => pushQuietly(deps, userId, message)));
  }

  return dto;
}

// ---------------------------------------------------------------------------------
// The real deps. `user` = the caller's own client (RLS applies), `admin` = the
// service-role client (rate limit, audit log, other users' push subscriptions).
// ---------------------------------------------------------------------------------
export function createIdentityCheckDeps(user: DbClient, admin: DbClient): IdentityCheckDeps {
  const push = createRealPushDeps(admin); // null when push is switched off
  return {
    now: () => new Date(),
    hitCounter: databaseHitCounter(admin),
    findPersonForCaller: (personId) => findPersonById(user, personId),
    listContactsForCaller: (personId) => listContacts(user, personId),
    insertForCaller: (check) => insertIdentityCheck(user, check),
    findForCaller: (checkId) => findIdentityCheckById(user, checkId),
    listRecentForCaller: (since, limit) => listRecentIdentityChecks(user, since, limit),
    answerForCaller: (check) => answerQuery(user, check),
    writeAudit: (entry) => writeAudit(admin, entry),
    sendPush: async (userId, message) => {
      if (push !== null) {
        await sendPushToUser(push, userId, message);
      }
    },
  };
}
