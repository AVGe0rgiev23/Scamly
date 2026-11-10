// Database queries of the moderation queue for public reports (task W3-04).
//
// Which client each caller passes (BUILD_PLAN 2.4):
//   * the moderator's own USER client for everything about reports: the RLS policies
//     "Moderators can read all reports" and "Moderators can review reports" check the
//     role again in the database, and the column privilege lets a moderator change
//     ONLY status, reviewed_by, reviewed_at and reject_reason (migration …_000004).
//   * the reviewers' display names come from `findDisplayNames()` in
//     adminRepository.ts, called with the ADMIN client: a moderator may read only
//     their own profile (see moderationService.ts).

import type { ScriptType } from "@/engine";
import type { ModerationStatus } from "@/schemas/moderation";
import type { DbClient } from "@/server/supabase/userClient";

// One report as the queue reads it. caller_number_hash stays on the server: the
// service turns it into "has a number" + "how many others have the same number".
export type ModerationRow = {
  id: string;
  district_code: string;
  script_type: ScriptType;
  occurred_on: string;
  description_redacted: string | null;
  caller_number_hash: string | null;
  status: ModerationStatus;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
};

const QUEUE_COLUMNS =
  "id, district_code, script_type, occurred_on, description_redacted, caller_number_hash, status, submitted_at, reviewed_by, reviewed_at, reject_reason";

// Where the next page starts: right after this report (newest first).
export type QueueCursor = { submittedAt: string; id: string };

// One page of reports with this status, newest first. Asks for `limit + 1` rows, so
// the caller knows whether there is another page. Two reports can have the same
// submitted_at, so the id breaks the tie (the same order as `.order()` below).
export async function listQueuePage(
  client: DbClient,
  status: ModerationStatus,
  after: QueueCursor | null,
  limit: number,
): Promise<ModerationRow[]> {
  let query = client.from("reports").select(QUEUE_COLUMNS).eq("status", status);
  if (after !== null) {
    // "older than the cursor, or the same moment with a smaller id". The time is in
    // double quotes because it contains ":" and "+" (PostgREST filter syntax).
    query = query.or(
      `submitted_at.lt."${after.submittedAt}",and(submitted_at.eq."${after.submittedAt}",id.lt.${after.id})`,
    );
  }
  const { data, error } = await query
    .order("submitted_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (error) {
    throw new Error(`listQueuePage failed: ${error.message}`);
  }
  return data;
}

// The time and status of one report (for the cursor, and for "404 or 409?").
// null = no such report (or the caller may not see it).
export async function findReportState(
  client: DbClient,
  id: string,
): Promise<{ submittedAt: string; status: ModerationStatus } | null> {
  const { data, error } = await client
    .from("reports")
    .select("submitted_at, status")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`findReportState failed: ${error.message}`);
  }
  return data === null ? null : { submittedAt: data.submitted_at, status: data.status };
}

// How many reports (any status) carry this caller-number hash. Only the NUMBER of
// rows comes back ("head: true" = no rows at all), never the rows themselves.
export async function countReportsWithHash(client: DbClient, hash: string): Promise<number> {
  const { count, error } = await client
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("caller_number_hash", hash);
  if (error) {
    throw new Error(`countReportsWithHash failed: ${error.message}`);
  }
  return count ?? 0;
}

// The moderator's decision.
export type ReviewChange = {
  status: "approved" | "rejected";
  reviewedBy: string;
  reviewedAt: string;
  rejectReason: string | null;
};

// Compare-and-set: changes the report ONLY while it is still pending
// (`… where id = $1 and status = 'pending'`). Two moderators clicking at the same
// moment: PostgreSQL runs the two UPDATEs one after the other, and the second finds
// no pending row. Returns the changed row, or null when nothing was changed.
export async function reviewPendingReport(
  client: DbClient,
  id: string,
  change: ReviewChange,
): Promise<{ id: string; district_code: string; script_type: ScriptType } | null> {
  const { data, error } = await client
    .from("reports")
    .update({
      status: change.status,
      reviewed_by: change.reviewedBy,
      reviewed_at: change.reviewedAt,
      reject_reason: change.rejectReason,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id, district_code, script_type");
  if (error) {
    throw new Error(`reviewPendingReport failed: ${error.message}`);
  }
  return data[0] ?? null;
}
