// Database queries for the checks table (one "someone is calling me for money" check).
//
// Reads take the client the caller chooses: the USER client for everything a person
// asks for (RLS shows a check only to its own device and to the family with access).
// Writes always take the ADMIN client: there is no INSERT or UPDATE policy on checks,
// because a phone must never be able to write its own verdict (BUILD_PLAN 2.4, uses 3
// and 4b). The service checks permissions in code before calling a write.

import type { DbClient } from "@/server/supabase/userClient";
import type { Database } from "@/types/database";

// One row of checks (like a Python TypedDict with every column).
export type CheckRow = Database["public"]["Tables"]["checks"]["Row"];

// Every column. The table has no secret columns (the text is already redacted and the
// caller's number would only be an HMAC), and the service picks what it sends back.
const CHECK_COLUMNS = "*";

// One check by id, or null when it doesn't exist OR the caller may not see it.
export async function findCheckById(client: DbClient, checkId: string): Promise<CheckRow | null> {
  const { data, error } = await client
    .from("checks")
    .select(CHECK_COLUMNS)
    .eq("id", checkId)
    .maybeSingle();
  if (error) {
    throw new Error(`findCheckById failed: ${error.message}`);
  }
  return data;
}

// The checks of one person, newest first, at most `limit`. `before` is a cursor:
// only checks that started before this moment (the startedAt of the previous page's
// last check), or null for the first page.
export async function listChecksOfPerson(
  client: DbClient,
  personId: string,
  before: string | null,
  limit: number,
): Promise<CheckRow[]> {
  let query = client
    .from("checks")
    .select(CHECK_COLUMNS)
    .eq("protected_person_id", personId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (before !== null) {
    query = query.lt("started_at", before);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`listChecksOfPerson failed: ${error.message}`);
  }
  return data;
}

// Creates a new check with status 'started' (admin client). Returns its id.
export async function insertCheck(
  admin: DbClient,
  check: { protectedPersonId: string; deviceId: string },
): Promise<string> {
  const { data, error } = await admin
    .from("checks")
    .insert({
      protected_person_id: check.protectedPersonId,
      device_id: check.deviceId,
      status: "started",
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(`insertCheck failed: ${error.message}`);
  }
  return data.id;
}

// The columns written when the answers arrive (answers + server-computed verdict).
export type CheckAnswersUpdate = {
  claimed_identity: CheckRow["claimed_identity"];
  asks_money: CheckRow["asks_money"];
  handover: CheckRow["handover"];
  rushing: CheckRow["rushing"];
  secrecy: CheckRow["secrecy"];
  text_redacted: string | null;
  score: number;
  risk_level: NonNullable<CheckRow["risk_level"]>; // NonNullable = "without null"
  script_type: NonNullable<CheckRow["script_type"]>;
  hard_rules: string[];
  reason_codes: string[];
  engine_version: string;
  answered_at: string;
};

// Stores the answers and the verdict, and sets status 'answered', in ONE statement:
//   UPDATE checks SET … , status = 'answered' WHERE id = $1 AND status = 'started'
// If two answers arrive at the same moment, PostgreSQL runs the UPDATEs one after the
// other and the second finds status = 'answered', so it changes nothing.
// Answers "not_started" when the check was not (or no longer) 'started'.
export async function saveCheckAnswers(
  admin: DbClient,
  checkId: string,
  fields: CheckAnswersUpdate,
): Promise<"saved" | "not_started"> {
  const { data, error } = await admin
    .from("checks")
    .update({ ...fields, status: "answered" })
    .eq("id", checkId)
    .eq("status", "started")
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(`saveCheckAnswers failed: ${error.message}`);
  }
  return data === null ? "not_started" : "saved";
}

// „Обаждам ѝ се сега“: writes who answered the alert, ONLY if nobody did before:
//   UPDATE checks SET acknowledged_by = $2, acknowledged_at = $3
//   WHERE id = $1 AND acknowledged_by IS NULL
// One atomic UPDATE, so when two family members press at the same moment, exactly
// one wins (first responder wins). Answers "already" for the other one.
export async function acknowledgeCheck(
  admin: DbClient,
  checkId: string,
  userId: string,
  at: Date,
): Promise<"acknowledged" | "already"> {
  const { data, error } = await admin
    .from("checks")
    .update({ acknowledged_by: userId, acknowledged_at: at.toISOString() })
    .eq("id", checkId)
    .is("acknowledged_by", null)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(`acknowledgeCheck failed: ${error.message}`);
  }
  return data === null ? "already" : "acknowledged";
}
