// The rate limiter: "at most N attempts per time window" for login, registration and
// pairing codes and invites, so nobody can guess passwords or codes by trying very fast.
//
// The counting itself happens in the database, in the SQL function hit_rate_limit()
// (supabase/migrations/20261102000005_functions.sql). It is atomic, so 100 parallel
// requests can't all slip through. This file only:
//   * holds our limits (RATE_LIMITS),
//   * builds the counter key, with the IP address turned into an HMAC first, so the
//     database never stores a real IP address (BUILD_PLAN 2.3),
//   * calls the SQL function through the admin client (BUILD_PLAN 2.4, use 7;
//     guests and users may not call it themselves).

import { getServerEnv } from "@/lib/env";
import { tooManyRequests } from "@/server/http/errors";
import { hmacSha256 } from "@/server/security/hash";
import { createAdminClient } from "@/server/supabase/adminClient";
import type { DbClient } from "@/server/supabase/userClient";

// One limit: at most `maxHits` attempts per `windowSeconds` (max 3600 in the SQL).
// A type with three fields, like a Python dataclass.
export type RateLimitRule = {
  name: string;
  maxHits: number;
  windowSeconds: number;
};

const FIFTEEN_MINUTES = 15 * 60;
const ONE_HOUR = 60 * 60;

// Our limits. Pairing numbers from BUILD_PLAN section 5: with 5 guesses per IP and
// 100 guesses in total per 15 minutes, the chance to hit an active code is ~0.01 %.
export const RATE_LIMITS = {
  loginPerIp: { name: "login:ip", maxHits: 10, windowSeconds: FIFTEEN_MINUTES },
  registerPerIp: { name: "register:ip", maxHits: 5, windowSeconds: ONE_HOUR },
  pairPerIp: { name: "pair:ip", maxHits: 5, windowSeconds: FIFTEEN_MINUTES },
  pairGlobal: { name: "pair:global", maxHits: 100, windowSeconds: FIFTEEN_MINUTES },
  // Invite links: a token has 256 random bits, so guessing is hopeless anyway; the
  // limit only stops one IP from hammering the endpoint.
  inviteRedeemPerIp: { name: "invite:ip", maxHits: 10, windowSeconds: FIFTEEN_MINUTES },
  // Call checks: at most 10 per paired phone per hour (stops alert spam to the family).
  checkPerDevice: { name: "check:device", maxHits: 10, windowSeconds: ONE_HOUR },
} satisfies Record<string, RateLimitRule>;

// The one thing the limiter needs from the outside world: "count one hit for this
// key; is it still allowed?". The real one calls the database; tests pass a fake.
// A function type, like Python's Callable[[str, int, int], Awaitable[bool]].
export type HitCounter = (key: string, maxHits: number, windowSeconds: number) => Promise<boolean>;

// The real counter: the SQL function hit_rate_limit() via the admin client.
export function databaseHitCounter(admin: DbClient): HitCounter {
  return async (key, maxHits, windowSeconds) => {
    const { data, error } = await admin.rpc("hit_rate_limit", {
      p_key: key,
      p_max_hits: maxHits,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      // Fail closed: if we can't count, we don't let the attempt through.
      throw new Error(`hit_rate_limit failed: ${error.message}`);
    }
    return data === true;
  };
}

// The key for one IP, e.g. "pair:ip:3f9a…" (HMAC of the IP with HASH_PEPPER).
export function ipKey(rule: RateLimitRule, ip: string, hashPepper: string): string {
  return `${rule.name}:${hmacSha256(ip, hashPepper)}`;
}

// Counts one attempt for `key` and answers "allowed" or "blocked".
export async function hitRateLimit(
  counter: HitCounter,
  rule: RateLimitRule,
  key: string,
): Promise<"allowed" | "blocked"> {
  const allowed = await counter(key, rule.maxHits, rule.windowSeconds);
  return allowed ? "allowed" : "blocked";
}

// Same, but throws a 429 error („Твърде много опити…“) when blocked.
export async function enforceRateLimit(
  counter: HitCounter,
  rule: RateLimitRule,
  key: string,
): Promise<void> {
  const result = await hitRateLimit(counter, rule, key);
  if (result === "blocked") {
    throw tooManyRequests();
  }
}

// The everyday shortcut for API routes: count one attempt of this IP for `rule`
// in the real database, and throw 429 when it is over the limit.
export async function enforceIpRateLimit(rule: RateLimitRule, ip: string): Promise<void> {
  const env = getServerEnv();
  const counter = databaseHitCounter(createAdminClient());
  await enforceRateLimit(counter, rule, ipKey(rule, ip, env.HASH_PEPPER));
}
