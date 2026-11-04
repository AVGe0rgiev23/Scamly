// Switching web push on and off for one browser (task W2-05, BUILD_PLAN 3 #23–#24):
//
//   saveSubscription()    POST   /api/push/subscriptions   "send notifications here"
//   removeSubscription()  DELETE /api/push/subscriptions   "stop sending them here"
//
// Any logged-in account may do this for ITSELF (a family member, and also a paired
// phone, a moderator or an admin). The two locks:
//   1. In code: the row's user_id is always the caller's own id from the session,
//      never something from the request body.
//   2. In the database: the writes use the caller's USER client, so RLS allows only
//      rows with user_id = auth.uid() (supabase/migrations/…_rls_policies.sql).
//
// "Upsert" by endpoint without an UPDATE right (there is none on this table): we first
// delete our own row with this endpoint, then insert it again with the new keys.

import "server-only";
import { bg } from "@/i18n/bg";
import type { PushSubscriptionInput, PushUnsubscribeInput } from "@/schemas/push";
import type { Actor } from "@/server/auth/actor";
import { conflict } from "@/server/http/errors";
import {
  deleteOwnPushSubscription,
  insertOwnPushSubscription,
} from "@/server/repositories/pushSubscriptionsRepository";
import {
  databaseHitCounter,
  enforceRateLimit,
  RATE_LIMITS,
  type HitCounter,
} from "@/server/security/rateLimit";
import type { DbClient } from "@/server/supabase/userClient";

// Everything this service needs from the outside world (tests pass fakes).
export type PushSubscriptionDeps = {
  hitCounter: HitCounter;
  deleteOwn: (userId: string, endpoint: string) => Promise<number>;
  insertOwn: (row: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }) => Promise<"inserted" | "endpoint_taken">;
};

// At most 20 changes per account per hour. The user id is not personal data, so no
// HMAC is needed (like the device id in checkService).
async function limitPerUser(deps: PushSubscriptionDeps, actor: Actor): Promise<void> {
  const rule = RATE_LIMITS.pushPerUser;
  await enforceRateLimit(deps.hitCounter, rule, `${rule.name}:${actor.userId}`);
}

// POST: stores (or refreshes) this browser's subscription for the caller.
// 409 "push_endpoint_taken" when the endpoint already belongs to ANOTHER account
// (someone else used this browser before). We can't see or delete that row (RLS), so
// the browser helper (src/lib/push.ts) then makes a fresh subscription and tries again.
export async function saveSubscription(
  deps: PushSubscriptionDeps,
  actor: Actor,
  input: PushSubscriptionInput,
): Promise<{ ok: true }> {
  await limitPerUser(deps, actor);
  await deps.deleteOwn(actor.userId, input.endpoint);
  const result = await deps.insertOwn({
    userId: actor.userId,
    endpoint: input.endpoint,
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
  });
  if (result === "endpoint_taken") {
    throw conflict("push_endpoint_taken", bg.push.endpointTaken);
  }
  return { ok: true };
}

// DELETE: forgets this browser for the caller. Only the caller's own row can go;
// someone else's endpoint simply matches nothing. Always 200 (doing it twice is fine).
export async function removeSubscription(
  deps: PushSubscriptionDeps,
  actor: Actor,
  input: PushUnsubscribeInput,
): Promise<{ ok: true; removed: boolean }> {
  await limitPerUser(deps, actor);
  const removedCount = await deps.deleteOwn(actor.userId, input.endpoint);
  return { ok: true, removed: removedCount > 0 };
}

// The real deps: writes with the USER client (RLS), counting with the admin client
// (the rate limiter, BUILD_PLAN 2.4 use 7).
export function createPushSubscriptionDeps(user: DbClient, admin: DbClient): PushSubscriptionDeps {
  return {
    hitCounter: databaseHitCounter(admin),
    deleteOwn: (userId, endpoint) => deleteOwnPushSubscription(user, userId, endpoint),
    insertOwn: (row) => insertOwnPushSubscription(user, row),
  };
}
