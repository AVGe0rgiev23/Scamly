// Device pairing: how the older person's phone gets logged in without a password
// (BUILD_PLAN section 5, decision D14).
//
//   createPairingCode()  family member (owner) asks for a 6-digit code, valid 10 min
//   redeemPairingCode()  the phone sends the code; if it is right, the server creates
//                        an account for this phone, signs it in and sets the cookies
//   revokeDevice()       the owner removes a lost phone: its account is deleted
//
// Nothing exists for a phone until a correct code arrives (no anonymous sign-in), so
// bots can't fill our user table. The service gets everything it needs from the
// outside world in one `deps` object (PairingDeps). The real one talks to Supabase
// (createPairingDeps at the bottom); the tests pass an in-memory fake. This is
// "dependency injection": like passing objects into a Python function instead of
// letting it import global ones.

import "server-only";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { bg } from "@/i18n/bg";
import { getServerEnv } from "@/lib/env";
import { RedeemCodeSchema } from "@/schemas/pairing";
import type { Actor } from "@/server/auth/actor";
import { badRequest, notFound } from "@/server/http/errors";
import { writeAudit, type AuditEntry } from "@/server/repositories/auditRepository";
import { createConfirmedUser, deleteAuthUser } from "@/server/repositories/authUsersRepository";
import {
  findDeviceById,
  insertDevice,
  type DeviceRef,
} from "@/server/repositories/devicesRepository";
import {
  consumePairingCode,
  deleteUnusedCodes,
  insertPairingCode,
  type ConsumedCode,
} from "@/server/repositories/pairingCodesRepository";
import { findPersonById } from "@/server/repositories/personsRepository";
import { setRoleProtected } from "@/server/repositories/profilesRepository";
import { hmacSha256 } from "@/server/security/hash";
import {
  databaseHitCounter,
  enforceRateLimit,
  ipKey,
  RATE_LIMITS,
  type HitCounter,
} from "@/server/security/rateLimit";
import type { DbClient } from "@/server/supabase/userClient";

// A code is valid for 10 minutes.
export const PAIRING_CODE_LIFETIME_MS = 10 * 60 * 1000;

// Device accounts get an e-mail on the reserved top-level domain .invalid
// (RFC 2606): it can never receive mail and can never belong to a real person.
// Checked on 3 Nov 2026: the live Supabase project accepts it.
export const DEVICE_EMAIL_DOMAIN = "devices.scamly.invalid";

// How often we draw a new code if the drawn one is already active elsewhere.
const MAX_CODE_ATTEMPTS = 5;

// Everything the pairing service needs from the outside world.
// "for the caller" = with the USER client, so RLS decides what the caller may see.
export type PairingDeps = {
  now: () => Date;
  generateCode: () => string;
  pairingPepper: string; // secret for code hashes (PAIRING_PEPPER)
  hashPepper: string; // secret for IP hashes in the rate limiter (HASH_PEPPER)
  hitCounter: HitCounter;
  findPersonForCaller: (personId: string) => Promise<{ id: string; owner_id: string } | null>;
  findDeviceForCaller: (deviceId: string) => Promise<DeviceRef | null>;
  findPersonName: (personId: string) => Promise<string | null>;
  cancelUnusedCodes: (personId: string) => Promise<void>;
  insertCode: (code: {
    protectedPersonId: string;
    codeHash: string;
    createdBy: string;
    expiresAt: Date;
  }) => Promise<"inserted" | "duplicate">;
  consumeCode: (codeHash: string, now: Date) => Promise<ConsumedCode | null>;
  createAuthUser: (account: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<string>;
  deleteAuthUser: (userId: string) => Promise<void>;
  makeProtected: (userId: string) => Promise<void>;
  insertDevice: (device: {
    protectedPersonId: string;
    userId: string;
    label: string | null;
  }) => Promise<string>;
  signInDevice: (email: string, password: string) => Promise<void>;
  writeAudit: (entry: AuditEntry) => Promise<void>;
};

// A crypto-random code from 000000 to 999999 (randomInt uses the operating system's
// secure random source, unlike Math.random).
export function generatePairingCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// ---------------------------------------------------------------------------------
// 1. POST /api/persons/:id/pairing-codes (family, owner only)
// ---------------------------------------------------------------------------------
export async function createPairingCode(
  deps: PairingDeps,
  actor: Actor,
  personId: string,
): Promise<{ code: string; expiresAt: string }> {
  // Lock 1: load the person with the caller's own client. RLS returns null if they
  // may not see it. Then only the OWNER may pair a phone. Both cases answer 404,
  // so a stranger can't find out that the person exists.
  const person = await deps.findPersonForCaller(personId);
  if (person === null || person.owner_id !== actor.userId) {
    throw notFound();
  }

  // Only the newest code of a person can be used.
  await deps.cancelUnusedCodes(personId);

  const expiresAt = new Date(deps.now().getTime() + PAIRING_CODE_LIFETIME_MS);
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    const code = deps.generateCode();
    const result = await deps.insertCode({
      protectedPersonId: personId,
      codeHash: hmacSha256(code, deps.pairingPepper),
      createdBy: actor.userId,
      expiresAt,
    });
    if (result === "inserted") {
      await deps.writeAudit({
        actorId: actor.userId,
        action: "pairing_code_created",
        targetType: "protected_person",
        targetId: personId,
        details: { expires_at: expiresAt.toISOString() },
      });
      // The code itself is returned once, to the owner's screen, and never stored.
      return { code, expiresAt: expiresAt.toISOString() };
    }
  }
  throw new Error("createPairingCode: no free code after several attempts");
}

// ---------------------------------------------------------------------------------
// 2. POST /api/pairing/redeem (guest, rate-limited)
// ---------------------------------------------------------------------------------
export async function redeemPairingCode(
  deps: PairingDeps,
  body: unknown,
  ip: string,
): Promise<{ deviceId: string; protectedPersonId: string; displayName: string }> {
  // Rate limits FIRST, so every attempt counts, even an invalid one:
  // 5 per 15 min per IP, and 100 per 15 min for everybody together.
  const perIp = RATE_LIMITS.pairPerIp;
  await enforceRateLimit(deps.hitCounter, perIp, ipKey(perIp, ip, deps.hashPepper));
  const global = RATE_LIMITS.pairGlobal;
  await enforceRateLimit(deps.hitCounter, global, global.name);

  const input = RedeemCodeSchema.parse(body);

  // Find the code and mark it used in ONE atomic UPDATE (see consumePairingCode).
  // Wrong, expired and used codes all get the same answer.
  const consumed = await deps.consumeCode(hmacSha256(input.code, deps.pairingPepper), deps.now());
  if (consumed === null) {
    throw badRequest("invalid_code", bg.pairing.invalidCode);
  }

  // The phone's own account. The password is 32 random bytes, used ONCE below to
  // sign in, then forgotten: it is never stored, logged or returned. From then on
  // only the refresh token in the HttpOnly cookie keeps the phone logged in.
  const personName =
    (await deps.findPersonName(consumed.protected_person_id)) ?? bg.areas.protected;
  const email = `device-${randomUUID()}@${DEVICE_EMAIL_DOMAIN}`;
  const password = randomBytes(32).toString("base64url");
  const userId = await deps.createAuthUser({ email, password, displayName: personName });

  let deviceId: string;
  try {
    await deps.makeProtected(userId);
    deviceId = await deps.insertDevice({
      protectedPersonId: consumed.protected_person_id,
      userId,
      label: input.label ?? null,
    });
    // Signs in on the server: the session cookies go onto this response.
    await deps.signInDevice(email, password);
  } catch (error) {
    // Don't leave a half-made device account behind.
    await deps.deleteAuthUser(userId).catch(() => undefined);
    throw error;
  }

  await deps.writeAudit({
    // The family member who created the code allowed this pairing.
    actorId: consumed.created_by,
    action: "device_paired",
    targetType: "device",
    targetId: deviceId,
    details: { protected_person_id: consumed.protected_person_id, pairing_code_id: consumed.id },
  });

  return { deviceId, protectedPersonId: consumed.protected_person_id, displayName: personName };
}

// ---------------------------------------------------------------------------------
// 3. DELETE /api/devices/:id (family, owner only)
// ---------------------------------------------------------------------------------
export async function revokeDevice(
  deps: PairingDeps,
  actor: Actor,
  deviceId: string,
): Promise<void> {
  // Lock 1: RLS shows the device only to family members of its person; then only
  // the owner may remove it. Anything else: 404.
  const device = await deps.findDeviceForCaller(deviceId);
  if (device === null) {
    throw notFound();
  }
  const person = await deps.findPersonForCaller(device.protected_person_id);
  if (person === null || person.owner_id !== actor.userId) {
    throw notFound();
  }

  // Deleting the phone's account kills its refresh token; the database deletes its
  // profile and device row with it (on delete cascade). Its next request gets 401.
  await deps.deleteAuthUser(device.user_id);

  await deps.writeAudit({
    actorId: actor.userId,
    action: "device_revoked",
    targetType: "device",
    targetId: device.id,
    details: { protected_person_id: device.protected_person_id },
  });
}

// ---------------------------------------------------------------------------------
// The real deps: Supabase. `user` = the caller's own client (RLS applies),
// `admin` = the service-role client (BUILD_PLAN 2.4, uses 1 and 2).
// ---------------------------------------------------------------------------------
export function createPairingDeps(user: DbClient, admin: DbClient): PairingDeps {
  const env = getServerEnv();
  return {
    now: () => new Date(),
    generateCode: generatePairingCode,
    pairingPepper: env.PAIRING_PEPPER,
    hashPepper: env.HASH_PEPPER,
    hitCounter: databaseHitCounter(admin),
    findPersonForCaller: (personId) => findPersonById(user, personId),
    findDeviceForCaller: (deviceId) => findDeviceById(user, deviceId),
    findPersonName: async (personId) => {
      const person = await findPersonById(admin, personId);
      return person === null ? null : person.display_name;
    },
    cancelUnusedCodes: (personId) => deleteUnusedCodes(admin, personId),
    insertCode: (code) => insertPairingCode(admin, code),
    consumeCode: (codeHash, now) => consumePairingCode(admin, codeHash, now),
    createAuthUser: (account) => createConfirmedUser(admin, account),
    deleteAuthUser: (userId) => deleteAuthUser(admin, userId),
    makeProtected: (userId) => setRoleProtected(admin, userId),
    insertDevice: (device) => insertDevice(admin, device),
    signInDevice: async (email, password) => {
      const { error } = await user.auth.signInWithPassword({ email, password });
      if (error) {
        throw new Error(`device sign-in failed: ${error.message}`);
      }
    },
    writeAudit: (entry) => writeAudit(admin, entry),
  };
}
