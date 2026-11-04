// Invites: how another relative joins the contact list of a protected person with
// their own account (W2-08, BUILD_PLAN 3 #12 and #13, section 8 Q7).
//
//   createInvite()  the OWNER asks for a link /pokana?t=<token>, valid 7 days, single use
//   redeemInvite()  a logged-in family member opens the link; the server adds them to
//                   the contact list WITH their account (user_id), so from now on they
//                   see the person and get alerts
//
// Same ideas as pairing (pairingService.ts): the token is shown once and only its
// HMAC is stored; it is used up by ONE atomic UPDATE; a wrong, expired or used token
// always gets the same answer; attempts are rate-limited per IP; both steps write an
// audit line. Why the service role: browsers have no INSERT right on contact_invites,
// and only the server may set trusted_contacts.user_id (BUILD_PLAN 2.5). The owner
// check before creating uses the USER client (RLS), like everywhere else.

import "server-only";
import { randomBytes } from "node:crypto";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { getServerEnv } from "@/lib/env";
import { MAX_CONTACTS } from "@/schemas/contacts";
import { RedeemInviteSchema, type CreateInviteInput } from "@/schemas/invites";
import type { Actor } from "@/server/auth/actor";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import { writeAudit, type AuditEntry } from "@/server/repositories/auditRepository";
import {
  insertLinkedContact,
  linkContact,
  listContacts,
  type ContactRow,
} from "@/server/repositories/contactsRepository";
import {
  consumeInvite,
  findOpenInvite,
  insertInvite,
  releaseInvite,
  type InviteRow,
} from "@/server/repositories/invitesRepository";
import { findPersonById } from "@/server/repositories/personsRepository";
import { hmacSha256 } from "@/server/security/hash";
import {
  databaseHitCounter,
  enforceRateLimit,
  ipKey,
  RATE_LIMITS,
  type HitCounter,
} from "@/server/security/rateLimit";
import type { DbClient } from "@/server/supabase/userClient";

// An invite link works for 7 days.
export const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

// 32 random bytes = 256 bits from the operating system's secure random source,
// written as 43 URL-safe characters (A–Z a–z 0–9 - _), e.g. "q3Xv…". Nobody can
// guess that, even with millions of tries.
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

// Everything the invite service needs from the outside world. "ForCaller" = with
// the USER client (RLS decides); everything else = service role, after our checks.
export type InviteDeps = {
  now: () => Date;
  generateToken: () => string;
  tokenPepper: string; // secret for token hashes (PAIRING_PEPPER, see createInviteDeps)
  hashPepper: string; // secret for IP hashes in the rate limiter (HASH_PEPPER)
  hitCounter: HitCounter;
  findPersonForCaller: (personId: string) => Promise<{ id: string; owner_id: string } | null>;
  findPerson: (
    personId: string,
  ) => Promise<{ id: string; owner_id: string; display_name: string } | null>;
  listContacts: (personId: string) => Promise<ContactRow[]>;
  insertInvite: (invite: {
    personId: string;
    displayName: string;
    priority: number;
    tokenHash: string;
    expiresAt: Date;
  }) => Promise<string>;
  findOpenInvite: (tokenHash: string, now: Date) => Promise<InviteRow | null>;
  consumeInvite: (inviteId: string, now: Date) => Promise<boolean>;
  releaseInvite: (inviteId: string, usedAt: Date) => Promise<void>;
  insertLinkedContact: (contact: {
    personId: string;
    userId: string;
    displayName: string;
    priority: number;
  }) => Promise<string | null>;
  linkContact: (contactId: string, userId: string) => Promise<boolean>;
  writeAudit: (entry: AuditEntry) => Promise<void>;
};

// ---------------------------------------------------------------------------------
// 1. POST /api/persons/:id/invites (family, owner only)
// ---------------------------------------------------------------------------------
export async function createInvite(
  deps: InviteDeps,
  actor: Actor,
  personId: string,
  input: CreateInviteInput,
): Promise<{ inviteId: string; invitePath: string; expiresAt: string }> {
  // Lock 1: RLS (user client) and then "owner only"; anyone else gets 404.
  const person = await deps.findPersonForCaller(personId);
  if (person === null || person.owner_id !== actor.userId) {
    throw notFound();
  }

  const token = deps.generateToken();
  const expiresAt = new Date(deps.now().getTime() + INVITE_LIFETIME_MS);
  const inviteId = await deps.insertInvite({
    personId,
    displayName: input.displayName,
    priority: input.priority,
    tokenHash: hmacSha256(token, deps.tokenPepper),
    expiresAt,
  });

  await deps.writeAudit({
    actorId: actor.userId,
    action: "invite_created",
    targetType: "contact_invite",
    targetId: inviteId,
    details: {
      protected_person_id: personId,
      priority: input.priority,
      expires_at: expiresAt.toISOString(),
    },
  });

  // The token itself is returned once, to the owner's screen, and never stored.
  // encodeURIComponent is not needed: base64url has only URL-safe characters.
  return {
    inviteId,
    invitePath: `${ROUTES.invite}?t=${token}`,
    expiresAt: expiresAt.toISOString(),
  };
}

// Where the new relative goes in the list. If the owner already added this relative
// by phone (same name, at the invite's place, no account yet), the invite attaches
// the account to THAT row, so they are not in the list twice ("link"). Otherwise a
// new row is added at the invite's place, or at the next free place after it, up to
// place 5 ("add"). null = no free place.
export type Placement = { kind: "link"; contactId: string } | { kind: "add"; priority: number };

export function choosePlacement(
  contacts: ContactRow[],
  invite: { display_name: string; priority: number },
): Placement | null {
  const atInvitePlace = contacts.find((row) => row.priority === invite.priority);
  if (
    atInvitePlace !== undefined &&
    atInvitePlace.user_id === null &&
    sameName(atInvitePlace.display_name, invite.display_name)
  ) {
    return { kind: "link", contactId: atInvitePlace.id };
  }

  for (let priority = invite.priority; priority <= MAX_CONTACTS; priority++) {
    const taken = contacts.some((row) => row.priority === priority);
    if (!taken) {
      return { kind: "add", priority };
    }
  }
  return null;
}

// "Иван " and "иван" are the same name.
function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase("bg") === b.trim().toLocaleLowerCase("bg");
}

// ---------------------------------------------------------------------------------
// 2. POST /api/invites/redeem (any logged-in family member, rate-limited per IP)
// ---------------------------------------------------------------------------------
export async function redeemInvite(
  deps: InviteDeps,
  actor: Actor,
  body: unknown,
  ip: string,
): Promise<{ protectedPersonId: string; personName: string; priority: number }> {
  // Rate limit FIRST, so every attempt counts, even an invalid one.
  const rule = RATE_LIMITS.inviteRedeemPerIp;
  await enforceRateLimit(deps.hitCounter, rule, ipKey(rule, ip, deps.hashPepper));

  const input = RedeemInviteSchema.parse(body);
  const now = deps.now();

  // Wrong, expired and used tokens all get the same answer.
  const invite = await deps.findOpenInvite(hmacSha256(input.token, deps.tokenPepper), now);
  if (invite === null) {
    throw badRequest("invalid_invite", bg.invites.invalidInvite);
  }
  const person = await deps.findPerson(invite.protected_person_id);
  if (person === null) {
    throw badRequest("invalid_invite", bg.invites.invalidInvite);
  }

  // Checks BEFORE the invite is used up, so a refused attempt doesn't waste the link
  // (e.g. the owner tapping their own link by mistake).
  if (person.owner_id === actor.userId) {
    throw conflict("own_invite", bg.invites.ownInvite);
  }
  const contacts = await deps.listContacts(person.id);
  if (contacts.some((row) => row.user_id === actor.userId)) {
    throw conflict("already_linked", bg.invites.alreadyLinked);
  }
  const placement = choosePlacement(contacts, invite);
  if (placement === null) {
    throw conflict("no_free_place", bg.invites.noFreePlace);
  }

  // Use up the invite in ONE atomic UPDATE. If someone else used it a moment ago,
  // this is false: same answer as a used token.
  const consumed = await deps.consumeInvite(invite.id, now);
  if (!consumed) {
    throw badRequest("invalid_invite", bg.invites.invalidInvite);
  }

  // Add (or link) the caller's account. If that fails, give the invite back so the
  // same link still works, like pairing deletes a half-made account.
  let contactId: string | null;
  let priority: number;
  try {
    if (placement.kind === "link") {
      const linked = await deps.linkContact(placement.contactId, actor.userId);
      contactId = linked ? placement.contactId : null;
      priority = invite.priority;
    } else {
      contactId = await deps.insertLinkedContact({
        personId: person.id,
        userId: actor.userId,
        displayName: invite.display_name,
        priority: placement.priority,
      });
      priority = placement.priority;
    }
  } catch (error) {
    await deps.releaseInvite(invite.id, now).catch(() => undefined);
    throw error;
  }
  if (contactId === null) {
    // The place or the account was taken at the same moment (unique rule).
    await deps.releaseInvite(invite.id, now);
    throw conflict("contacts_changed", bg.invites.tryAgain);
  }

  await deps.writeAudit({
    actorId: actor.userId,
    action: "invite_redeemed",
    targetType: "trusted_contact",
    targetId: contactId,
    details: {
      protected_person_id: person.id,
      invite_id: invite.id,
      priority,
      linked_existing_contact: placement.kind === "link",
    },
  });

  return { protectedPersonId: person.id, personName: person.display_name, priority };
}

// ---------------------------------------------------------------------------------
// The real deps. `user` = the caller's own client (RLS), `admin` = service role.
// Token pepper: we reuse PAIRING_PEPPER, the secret for "codes that let someone join
// a protected person" (no new environment variable needed).
// ---------------------------------------------------------------------------------
export function createInviteDeps(user: DbClient, admin: DbClient): InviteDeps {
  const env = getServerEnv();
  return {
    now: () => new Date(),
    generateToken: generateInviteToken,
    tokenPepper: env.PAIRING_PEPPER,
    hashPepper: env.HASH_PEPPER,
    hitCounter: databaseHitCounter(admin),
    findPersonForCaller: (personId) => findPersonById(user, personId),
    findPerson: (personId) => findPersonById(admin, personId),
    listContacts: (personId) => listContacts(admin, personId),
    insertInvite: (invite) => insertInvite(admin, invite),
    findOpenInvite: (tokenHash, now) => findOpenInvite(admin, tokenHash, now),
    consumeInvite: (inviteId, now) => consumeInvite(admin, inviteId, now),
    releaseInvite: (inviteId, usedAt) => releaseInvite(admin, inviteId, usedAt),
    insertLinkedContact: (contact) => insertLinkedContact(admin, contact),
    linkContact: (contactId, userId) => linkContact(admin, contactId, userId),
    writeAudit: (entry) => writeAudit(admin, entry),
  };
}
