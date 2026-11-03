// Database queries for the pairing_codes table. Browsers have NO access to this
// table at all, so every function here takes the admin client (BUILD_PLAN 2.4).
// We only ever store the HMAC of a code (code_hash), never the code.

import type { DbClient } from "@/server/supabase/userClient";

// "Cancel old unused codes" of a person: they are simply deleted, so at most one
// code per person can be redeemed. Used codes stay as history.
export async function deleteUnusedCodes(admin: DbClient, personId: string): Promise<void> {
  const { error } = await admin
    .from("pairing_codes")
    .delete()
    .eq("protected_person_id", personId)
    .is("used_at", null);
  if (error) {
    throw new Error(`deleteUnusedCodes failed: ${error.message}`);
  }
}

// Stores a new code. Answers "duplicate" when another unused code has the same hash
// (two people got the same 6 digits at the same time: the unique index
// pairing_codes_unused_code_hash_key refuses it), so the caller can draw a new code.
export async function insertPairingCode(
  admin: DbClient,
  code: { protectedPersonId: string; codeHash: string; createdBy: string; expiresAt: Date },
): Promise<"inserted" | "duplicate"> {
  const { error } = await admin.from("pairing_codes").insert({
    protected_person_id: code.protectedPersonId,
    code_hash: code.codeHash,
    created_by: code.createdBy,
    expires_at: code.expiresAt.toISOString(),
  });
  if (error) {
    // 23505 = PostgreSQL "unique_violation".
    if (error.code === "23505") {
      return "duplicate";
    }
    throw new Error(`insertPairingCode failed: ${error.message}`);
  }
  return "inserted";
}

// What we learn from a successfully redeemed code.
export type ConsumedCode = {
  id: string;
  protected_person_id: string;
  created_by: string;
};

// Redeems a code: finds it AND marks it used in ONE statement:
//   UPDATE pairing_codes SET used_at = now
//   WHERE code_hash = $1 AND used_at IS NULL AND expires_at > now
//   RETURNING id, protected_person_id, created_by
// (supabase-js sends this as one PATCH request, which PostgREST runs as one UPDATE).
// One UPDATE is atomic: if two phones send the same code at the same moment,
// PostgreSQL locks the row, the second UPDATE re-checks "used_at IS NULL", finds it
// false and changes nothing. So a code can never be used twice.
// Returns null for a wrong, expired or already used code (we don't say which).
export async function consumePairingCode(
  admin: DbClient,
  codeHash: string,
  now: Date,
): Promise<ConsumedCode | null> {
  const nowIso = now.toISOString();
  const { data, error } = await admin
    .from("pairing_codes")
    .update({ used_at: nowIso })
    .eq("code_hash", codeHash)
    .is("used_at", null)
    .gt("expires_at", nowIso)
    .select("id, protected_person_id, created_by")
    .maybeSingle();
  if (error) {
    throw new Error(`consumePairingCode failed: ${error.message}`);
  }
  return data;
}
