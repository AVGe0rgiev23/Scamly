// HMAC-SHA256: a "keyed fingerprint" of a value.
//
// hmacSha256("482915", pepper) always gives the same 64 hex characters for the same
// value and pepper, but without the pepper (a secret that lives only in environment
// variables) nobody can compute it. Why not plain SHA-256? A 6-digit code has only
// 1,000,000 possibilities: with plain SHA-256 a leaked database could be reversed by
// trying them all in under a second. With a secret pepper, the leaked hashes alone
// are useless (BUILD_PLAN 2.3).
//
// Used for: pairing codes (PAIRING_PEPPER), IP addresses in the rate limiter and
// later phone numbers (HASH_PEPPER).

import { createHmac } from "node:crypto";

export function hmacSha256(value: string, pepper: string): string {
  return createHmac("sha256", pepper).update(value, "utf8").digest("hex");
}
