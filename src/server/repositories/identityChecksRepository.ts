// Database queries for the identity_checks table („Провери истинския“, D34, P-05).
//
// Unlike checks, every read AND write here uses the caller's USER client: the
// database itself allows a phone to ask only a family member of its own person, and
// only the claimed family member to answer, once, within 15 minutes (RLS and column
// privileges, migration 20261126000001). The service checks the same rules in code
// first, so these are the second lock, not the only one.

import type { IdentityAnswer } from "@/schemas/identityChecks";
import type { DbClient } from "@/server/supabase/userClient";
import type { Database } from "@/types/database";

// One row of identity_checks (like a Python TypedDict with every column).
export type IdentityCheckRow = Database["public"]["Tables"]["identity_checks"]["Row"];

const COLUMNS =
  "id, protected_person_id, device_id, claimed_user_id, status, created_at, answered_at";

// PostgreSQL error codes we expect.
const INSUFFICIENT_PRIVILEGE = "42501"; // RLS refused the new row
const UNIQUE_VIOLATION = "23505"; // another pending question of the same phone won a race

// A new question from the caller's phone. The database sets status 'pending' and
// created_at, and marks the phone's previous pending question 'expired' (trigger).
// "refused" = RLS said no (e.g. the account is not a family account of the person),
// "busy" = a second question of the same phone was stored at the same moment.
export async function insertIdentityCheck(
  client: DbClient,
  check: { protectedPersonId: string; deviceId: string; claimedUserId: string },
): Promise<IdentityCheckRow | "refused" | "busy"> {
  const { data, error } = await client
    .from("identity_checks")
    .insert({
      protected_person_id: check.protectedPersonId,
      device_id: check.deviceId,
      claimed_user_id: check.claimedUserId,
    })
    .select(COLUMNS)
    .single();
  if (error) {
    if (error.code === INSUFFICIENT_PRIVILEGE) {
      return "refused";
    }
    if (error.code === UNIQUE_VIOLATION) {
      return "busy";
    }
    throw new Error(`insertIdentityCheck failed: ${error.message}`);
  }
  return data;
}

// One question by id, or null when it doesn't exist OR the caller may not see it.
export async function findIdentityCheckById(
  client: DbClient,
  checkId: string,
): Promise<IdentityCheckRow | null> {
  const { data, error } = await client
    .from("identity_checks")
    .select(COLUMNS)
    .eq("id", checkId)
    .maybeSingle();
  if (error) {
    throw new Error(`findIdentityCheckById failed: ${error.message}`);
  }
  return data;
}

// The questions the caller may see that were asked after `since`, newest first.
export async function listRecentIdentityChecks(
  client: DbClient,
  since: string,
  limit: number,
): Promise<IdentityCheckRow[]> {
  const { data, error } = await client
    .from("identity_checks")
    .select(COLUMNS)
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    throw new Error(`listRecentIdentityChecks failed: ${error.message}`);
  }
  return data;
}

// The answer, as a compare-and-set in ONE statement:
//   UPDATE identity_checks SET status = $answer
//   WHERE id = $1 AND claimed_user_id = $me AND status = 'pending' AND created_at > $notBefore
// Two answers at the same moment: PostgreSQL runs them one after the other, and the
// second finds status <> 'pending', so it changes nothing. The database trigger writes
// answered_at. Returns the updated row, or null when nothing was changed.
export async function answerIdentityCheck(
  client: DbClient,
  check: { id: string; userId: string; answer: IdentityAnswer; notBefore: string },
): Promise<IdentityCheckRow | null> {
  const { data, error } = await client
    .from("identity_checks")
    .update({ status: check.answer })
    .eq("id", check.id)
    .eq("claimed_user_id", check.userId)
    .eq("status", "pending")
    .gt("created_at", check.notBefore)
    .select(COLUMNS)
    .maybeSingle();
  if (error) {
    throw new Error(`answerIdentityCheck failed: ${error.message}`);
  }
  return data;
}
